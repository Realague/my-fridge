import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export class MigrationRunner {
  private readonly cwd: string;

  constructor() {
    this.cwd = path.resolve(__dirname, '../..');
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Running database migrations...');
      
      const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate', {
        cwd: this.cwd,
        env: { ...process.env }
      });

      if (stderr && !stderr.includes('Sequelize CLI')) {
        console.warn('Migration warnings:', stderr);
      }

      console.log('✅ Migrations completed successfully');
      if (stdout.trim()) {
        console.log('Migration output:', stdout);
      }
    } catch (error: any) {
      console.error('❌ Migration failed:', error.message);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }

  /**
   * Check migration status
   */
  async getMigrationStatus(): Promise<string> {
    try {
      const { stdout } = await execAsync('npx sequelize-cli db:migrate:status', {
        cwd: this.cwd,
        env: { ...process.env }
      });
      return stdout;
    } catch (error: any) {
      console.error('Failed to get migration status:', error.message);
      throw new Error(`Failed to get migration status: ${error.message}`);
    }
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string): Promise<string> {
    try {
      console.log(`🔄 Creating migration: ${name}`);
      
      const { stdout } = await execAsync(`npx sequelize-cli migration:generate --name ${name}`, {
        cwd: this.cwd,
        env: { ...process.env }
      });

      console.log('✅ Migration file created');
      return stdout;
    } catch (error: any) {
      console.error('❌ Failed to create migration:', error.message);
      throw new Error(`Failed to create migration: ${error.message}`);
    }
  }

  /**
   * Rollback the last migration
   */
  async rollbackLastMigration(): Promise<void> {
    try {
      console.log('🔄 Rolling back last migration...');
      
      const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate:undo', {
        cwd: this.cwd,
        env: { ...process.env }
      });

      if (stderr && !stderr.includes('Sequelize CLI')) {
        console.warn('Rollback warnings:', stderr);
      }

      console.log('✅ Migration rollback completed');
      if (stdout.trim()) {
        console.log('Rollback output:', stdout);
      }
    } catch (error: any) {
      console.error('❌ Migration rollback failed:', error.message);
      throw new Error(`Migration rollback failed: ${error.message}`);
    }
  }

  /**
   * Rollback all migrations
   */
  async rollbackAllMigrations(): Promise<void> {
    try {
      console.log('🔄 Rolling back all migrations...');
      
      const { stdout, stderr } = await execAsync('npx sequelize-cli db:migrate:undo:all', {
        cwd: this.cwd,
        env: { ...process.env }
      });

      if (stderr && !stderr.includes('Sequelize CLI')) {
        console.warn('Rollback warnings:', stderr);
      }

      console.log('✅ All migrations rolled back');
      if (stdout.trim()) {
        console.log('Rollback output:', stdout);
      }
    } catch (error: any) {
      console.error('❌ Migration rollback failed:', error.message);
      throw new Error(`Migration rollback failed: ${error.message}`);
    }
  }
}

export const migrationRunner = new MigrationRunner(); 