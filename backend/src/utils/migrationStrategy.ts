import { migrationManager, MigrationResult } from './migrationManager';

export interface MigrationStrategyOptions {
  environment: 'development' | 'staging' | 'production';
  allowAutoMigration: boolean;
  requireManualApproval: boolean;
  backupBeforeMigration: boolean;
  maxConcurrentMigrations: number;
  timeoutMs: number;
}

export abstract class MigrationStrategy {
  protected options: MigrationStrategyOptions;

  constructor(options: MigrationStrategyOptions) {
    this.options = options;
  }

  abstract execute(): Promise<MigrationResult>;
  
  protected async validatePreconditions(): Promise<void> {
    // Test database connection
    const isConnected = await migrationManager.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Validate migration files
    const validation = await migrationManager.validateMigrations();
    if (!validation.valid) {
      throw new Error(`Migration validation failed: ${validation.errors.join(', ')}`);
    }
  }
}

/**
 * Development Strategy: Auto-run migrations, immediate feedback
 */
export class DevelopmentMigrationStrategy extends MigrationStrategy {
  async execute(): Promise<MigrationResult> {
    console.log('🔧 Running development migration strategy...');
    
    await this.validatePreconditions();
    
    if (!this.options.allowAutoMigration) {
      console.log('⏭️  Auto-migration disabled for development environment');
      return {
        success: true,
        migrationsRun: [],
        errors: [],
        totalTime: 0
      };
    }

    // Run migrations immediately
    return await migrationManager.runMigrations();
  }
}

/**
 * Staging Strategy: Dry-run first, then execute with approval
 */
export class StagingMigrationStrategy extends MigrationStrategy {
  async execute(): Promise<MigrationResult> {
    console.log('🎭 Running staging migration strategy...');
    
    await this.validatePreconditions();

    // Always do a dry run first
    const dryRunResult = await migrationManager.runMigrations({ dryRun: true });
    
    if (dryRunResult.migrationsRun.length === 0) {
      console.log('📋 No pending migrations in staging');
      return dryRunResult;
    }

    if (this.options.requireManualApproval) {
      console.log('⚠️  Manual approval required for staging migrations');
      console.log('   Run with APPROVE_MIGRATIONS=true to execute');
      
      if (process.env.APPROVE_MIGRATIONS !== 'true') {
        return {
          success: false,
          migrationsRun: [],
          errors: ['Manual approval required. Set APPROVE_MIGRATIONS=true'],
          totalTime: 0
        };
      }
    }

    // Execute migrations
    return await migrationManager.runMigrations();
  }
}

/**
 * Production Strategy: Same as development — run pending migrations at startup.
 * Set AUTO_MIGRATE=false to skip (e.g. maintenance or external migration process).
 */
export class ProductionMigrationStrategy extends MigrationStrategy {
  async execute(): Promise<MigrationResult> {
    console.log('🏭 Running production migration strategy...');
    
    await this.validatePreconditions();

    if (!this.options.allowAutoMigration) {
      console.log('⏭️  Auto-migration disabled (AUTO_MIGRATE=false)');
      return {
        success: true,
        migrationsRun: [],
        errors: [],
        totalTime: 0
      };
    }

    return await migrationManager.runMigrations();
  }
}

/**
 * Manual Strategy: Never auto-execute, only report status
 */
export class ManualMigrationStrategy extends MigrationStrategy {
  async execute(): Promise<MigrationResult> {
    console.log('👤 Running manual migration strategy...');
    
    await this.validatePreconditions();

    const status = await migrationManager.getMigrationStatus();
    const pending = status.filter(s => !s.executed);

    if (pending.length === 0) {
      console.log('📋 All migrations are up to date');
    } else {
      console.log(`📋 ${pending.length} pending migration(s):`);
      pending.forEach(s => console.log(`  - ${s.filename}`));
      console.log('');
      console.log('Use migration API or CLI commands to execute manually');
    }

    return {
      success: true,
      migrationsRun: [],
      errors: [],
      totalTime: 0
    };
  }
}

/**
 * Factory function to create appropriate migration strategy
 */
export function createMigrationStrategy(options?: Partial<MigrationStrategyOptions>): MigrationStrategy {
  const environment = (process.env.NODE_ENV as any) || 'development';
  
  const defaultOptions: MigrationStrategyOptions = {
    environment,
    allowAutoMigration: process.env.AUTO_MIGRATE !== 'false',
    requireManualApproval: environment === 'production',
    backupBeforeMigration: environment === 'production',
    maxConcurrentMigrations: 1,
    timeoutMs: 30000
  };

  const finalOptions = { ...defaultOptions, ...options };

  switch (finalOptions.environment) {
    case 'development':
      return new DevelopmentMigrationStrategy(finalOptions);
    
    case 'staging':
      return new StagingMigrationStrategy(finalOptions);
    
    case 'production':
      return new ProductionMigrationStrategy(finalOptions);
    
    default:
      return new ManualMigrationStrategy(finalOptions);
  }
}

/**
 * Smart migration executor that chooses strategy based on environment
 */
export async function executeSmartMigration(options?: Partial<MigrationStrategyOptions>): Promise<MigrationResult> {
  const strategy = createMigrationStrategy(options);
  
  try {
    return await strategy.execute();
  } catch (error: any) {
    console.error('💥 Migration strategy execution failed:', error.message);
    return {
      success: false,
      migrationsRun: [],
      errors: [error.message],
      totalTime: 0
    };
  }
} 