import { QueryInterface, Sequelize, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import fs from 'fs/promises';
import path from 'path';

export interface MigrationFile {
  filename: string;
  timestamp: string;
  name: string;
  up: (queryInterface: QueryInterface, sequelize: Sequelize) => Promise<void>;
  down: (queryInterface: QueryInterface, sequelize: Sequelize) => Promise<void>;
}

export interface MigrationStatus {
  filename: string;
  executed: boolean;
  executedAt?: Date;
}

export interface MigrationResult {
  success: boolean;
  migrationsRun: string[];
  errors: string[];
  totalTime: number;
}

export class MigrationManager {
  private readonly migrationTableName = 'SequelizeMeta';
  private readonly migrationsPath: string;

  constructor() {
    this.migrationsPath = path.resolve(__dirname, '../migrations');
  }

  /**
   * Ensure migration table exists
   */
  private async ensureMigrationTable(): Promise<void> {
    const queryInterface = sequelize.getQueryInterface();
    
    const tableExists = await queryInterface.tableExists(this.migrationTableName);
    if (!tableExists) {
      await queryInterface.createTable(this.migrationTableName, {
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true
        }
      });
    }
  }

  /**
   * Get executed migrations from database
   */
  private async getExecutedMigrations(): Promise<string[]> {
    await this.ensureMigrationTable();
    
    const [results] = await sequelize.query(
      `SELECT name FROM "${this.migrationTableName}" ORDER BY name;`
    ) as any;
    
    return results.map((row: any) => row.name);
  }

  /**
   * Load migration files from disk
   */
  private async loadMigrationFiles(): Promise<MigrationFile[]> {
    try {
      const files = await fs.readdir(this.migrationsPath);
      const migrationFiles: MigrationFile[] = [];

      for (const file of files) {
        // .d.ts also ends with ".ts" — never load declaration files
        if (file.endsWith('.d.ts')) continue;
        if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;

        const filepath = path.join(this.migrationsPath, file);
        const migration = require(filepath);

        const timestamp = file.substring(0, 14); // Extract timestamp from filename
        const name = file.substring(15, file.lastIndexOf('.')); // Extract name

        migrationFiles.push({
          filename: file,
          timestamp,
          name,
          up: migration.up,
          down: migration.down
        });
      }

      // Sort by timestamp
      return migrationFiles.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    } catch (error) {
      console.error('Failed to load migration files:', error);
      return [];
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<MigrationStatus[]> {
    const [migrationFiles, executedMigrations] = await Promise.all([
      this.loadMigrationFiles(),
      this.getExecutedMigrations()
    ]);

    return migrationFiles.map(file => ({
      filename: file.filename,
      executed: executedMigrations.includes(file.filename),
      executedAt: undefined // Could be enhanced to store execution timestamps
    }));
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<MigrationFile[]> {
    const [migrationFiles, executedMigrations] = await Promise.all([
      this.loadMigrationFiles(),
      this.getExecutedMigrations()
    ]);

    return migrationFiles.filter(file => !executedMigrations.includes(file.filename));
  }

  /**
   * Run a single migration within a transaction
   */
  private async runSingleMigration(migration: MigrationFile, direction: 'up' | 'down'): Promise<void> {
    const transaction = await sequelize.transaction();
    
    try {
      console.log(`🔄 ${direction === 'up' ? 'Running' : 'Rolling back'} migration: ${migration.filename}`);
      
      const queryInterface = sequelize.getQueryInterface();
      
      if (direction === 'up') {
        await migration.up(queryInterface, sequelize);
        await sequelize.query(
          `INSERT INTO "${this.migrationTableName}" (name) VALUES (:name)`,
          { 
            replacements: { name: migration.filename },
            transaction 
          }
        );
      } else {
        await migration.down(queryInterface, sequelize);
        await sequelize.query(
          `DELETE FROM "${this.migrationTableName}" WHERE name = :name`,
          { 
            replacements: { name: migration.filename },
            transaction 
          }
        );
      }
      
      await transaction.commit();
      console.log(`✅ Migration ${direction}: ${migration.filename}`);
    } catch (error) {
      await transaction.rollback();
      console.error(`❌ Migration ${direction} failed: ${migration.filename}`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(options: { dryRun?: boolean } = {}): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: true,
      migrationsRun: [],
      errors: [],
      totalTime: 0
    };

    try {
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        console.log('📋 No pending migrations to run');
        result.totalTime = Date.now() - startTime;
        return result;
      }

      if (options.dryRun) {
        console.log('🧪 DRY RUN - Would execute the following migrations:');
        pendingMigrations.forEach(m => console.log(`  - ${m.filename}`));
        result.totalTime = Date.now() - startTime;
        return result;
      }

      console.log(`🚀 Running ${pendingMigrations.length} pending migration(s)...`);

      for (const migration of pendingMigrations) {
        try {
          await this.runSingleMigration(migration, 'up');
          result.migrationsRun.push(migration.filename);
        } catch (error: any) {
          result.success = false;
          result.errors.push(`${migration.filename}: ${error.message}`);
          break; // Stop on first error
        }
      }

      result.totalTime = Date.now() - startTime;
      
      if (result.success) {
        console.log(`🎉 Successfully ran ${result.migrationsRun.length} migration(s) in ${result.totalTime}ms`);
      } else {
        console.error(`💥 Migration failed. Ran ${result.migrationsRun.length} migrations before error.`);
      }

      return result;
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
      result.totalTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Rollback the last migration
   */
  async rollbackLastMigration(): Promise<void> {
    const executedMigrations = await this.getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('📋 No migrations to rollback');
      return;
    }

    const migrationFiles = await this.loadMigrationFiles();
    const lastExecutedMigration = executedMigrations[executedMigrations.length - 1];
    const migrationToRollback = migrationFiles.find(m => m.filename === lastExecutedMigration);

    if (!migrationToRollback) {
      throw new Error(`Migration file not found: ${lastExecutedMigration}`);
    }

    await this.runSingleMigration(migrationToRollback, 'down');
  }

  /**
   * Rollback to a specific migration
   */
  async rollbackToMigration(targetMigration: string): Promise<void> {
    const executedMigrations = await this.getExecutedMigrations();
    const migrationFiles = await this.loadMigrationFiles();
    
    const targetIndex = migrationFiles.findIndex(m => m.filename === targetMigration);
    if (targetIndex === -1) {
      throw new Error(`Target migration not found: ${targetMigration}`);
    }

    // Get migrations to rollback (in reverse order)
    const migrationsToRollback = executedMigrations
      .filter(name => {
        const migrationIndex = migrationFiles.findIndex(m => m.filename === name);
        return migrationIndex > targetIndex;
      })
      .reverse();

    for (const migrationName of migrationsToRollback) {
      const migration = migrationFiles.find(m => m.filename === migrationName);
      if (migration) {
        await this.runSingleMigration(migration, 'down');
      }
    }
  }

  /**
   * Validate migration files
   */
  async validateMigrations(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const migrationFiles = await this.loadMigrationFiles();
      
      for (const migration of migrationFiles) {
        if (typeof migration.up !== 'function') {
          errors.push(`${migration.filename}: Missing or invalid 'up' function`);
        }
        
        if (typeof migration.down !== 'function') {
          errors.push(`${migration.filename}: Missing or invalid 'down' function`);
        }
      }
      
      // Check for duplicate timestamps
      const timestamps = migrationFiles.map(m => m.timestamp);
      const duplicates = timestamps.filter((ts, index) => timestamps.indexOf(ts) !== index);
      
      if (duplicates.length > 0) {
        errors.push(`Duplicate migration timestamps found: ${duplicates.join(', ')}`);
      }
      
    } catch (error: any) {
      errors.push(`Failed to validate migrations: ${error.message}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await sequelize.authenticate();
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }
}

export const migrationManager = new MigrationManager(); 