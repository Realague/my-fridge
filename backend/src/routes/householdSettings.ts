import { Router } from 'express';
import { HouseholdSettingsController } from '../controllers/HouseholdSettingsController';
import { HouseholdSettingsService } from '../services/HouseholdSettingsService';
import { HouseholdSettingsRepository } from '../repositories/HouseholdSettingsRepository';
import { HouseholdRepository } from '../repositories/HouseholdRepository';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();

const settingsRepository = new HouseholdSettingsRepository();
const householdRepository = new HouseholdRepository();
const settingsService = new HouseholdSettingsService(settingsRepository, householdRepository);
const settingsController = new HouseholdSettingsController(settingsService);

router.use(authenticateGoogleToken);

router.get('/:householdId/settings', settingsController.getSettings.bind(settingsController));
router.put('/:householdId/settings', settingsController.updateSettings.bind(settingsController));

export default router;
