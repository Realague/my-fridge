import express from 'express';
import { migrationManager } from '../utils/migrationManager';
import { executeSmartMigration } from '../utils/migrationStrategy';

const router = express.Router();

/**
 * Get migration status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await migrationManager.getMigrationStatus();
    res.json({
      success: true,
      status: status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Run pending migrations using smart strategy
 */
router.post('/run', async (req, res) => {
  try {
    const result = await migrationManager.runMigrations();
    res.json({
      success: result.success,
      message: result.success ? 'Migrations completed successfully' : 'Migration failed',
      result: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Run migrations with environment-specific strategy
 */
router.post('/smart-run', async (req, res) => {
  try {
    const result = await executeSmartMigration();
    res.json({
      success: result.success,
      message: result.success ? 'Smart migration completed successfully' : 'Smart migration failed',
      result: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Validate migrations
 */
router.get('/validate', async (req, res) => {
  try {
    const validation = await migrationManager.validateMigrations();
    res.json({
      success: validation.valid,
      valid: validation.valid,
      errors: validation.errors
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get pending migrations
 */
router.get('/pending', async (req, res) => {
  try {
    const pending = await migrationManager.getPendingMigrations();
    res.json({
      success: true,
      pending: pending.map(m => ({
        filename: m.filename,
        name: m.name,
        timestamp: m.timestamp
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rollback last migration
 */
router.post('/rollback', async (req, res) => {
  try {
    await migrationManager.rollbackLastMigration();
    res.json({
      success: true,
      message: 'Last migration rolled back successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Rollback to specific migration
 */
router.post('/rollback-to', async (req, res) => {
  try {
    const { migration } = req.body;
    
    if (!migration) {
      return res.status(400).json({
        success: false,
        error: 'Target migration is required'
      });
    }

    await migrationManager.rollbackToMigration(migration);
    return res.json({
      success: true,
      message: `Rolled back to migration: ${migration}`
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Production-safe migration execution
 */
router.post('/run-production', async (req, res) => {
  try {
    // Extra safety check for production
    if (process.env.NODE_ENV !== 'production') {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only available in production environment'
      });
    }

    const { confirm } = req.body;
    if (confirm !== 'I understand the risks') {
      return res.status(400).json({
        success: false,
        error: 'Production migrations require confirmation. Send {"confirm": "I understand the risks"}'
      });
    }

    const result = await migrationManager.runMigrations();
    return res.json({
      success: result.success,
      message: result.success ? 'Production migrations completed' : 'Production migration failed',
      result: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router; 