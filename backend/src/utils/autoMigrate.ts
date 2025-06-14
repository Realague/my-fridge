import { migrationRunner } from './migrationRunner';
import sequelize from '../config/database';

export interface AutoMigrateOptions {
  force?: boolean;
  verbose?: boolean;
  exitOnFailure?: boolean;
}

/**
 * Automatically run migrations on application startup
 */
export async function autoMigrate(options: AutoMigrateOptions = {}): Promise<void> {
  const { force = false, verbose = true, exitOnFailure = true } = options;

  try {
    if (verbose) {
      console.log('🚀 Starting automatic migration process...');
    }

    // First, test database connection
    await sequelize.authenticate();
    if (verbose) {
      console.log('✅ Database connection established');
    }

    // Check current migration status
    if (verbose) {
      try {
        const status = await migrationRunner.getMigrationStatus();
        console.log('📊 Current migration status:');
        console.log(status);
      } catch (error) {
        console.log('📊 No previous migrations found or migration table doesn\'t exist yet');
      }
    }

    // Run pending migrations
    await migrationRunner.runMigrations();

    if (verbose) {
      console.log('🎉 Automatic migration process completed successfully!');
    }

  } catch (error: any) {
    console.error('💥 Automatic migration failed:', error.message);
    
    if (exitOnFailure) {
      console.error('Exiting application due to migration failure...');
      process.exit(1);
    } else {
      throw error;
    }
  }
}

/**
 * Create migrations directory structure if it doesn't exist
 */
export async function ensureMigrationDirectories(): Promise<void> {
  const fs = require('fs').promises;
  const path = require('path');

  const directories = [
    path.resolve(__dirname, '../migrations'),
    path.resolve(__dirname, '../seeders')
  ];

  for (const dir of directories) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }
} 