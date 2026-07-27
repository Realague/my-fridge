import { Router } from 'express';
import { HouseholdStatsController } from '../controllers/HouseholdStatsController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const controller = new HouseholdStatsController();

router.use(authenticateGoogleToken);

// GET /households/:householdId/stats/summary - cartes résumé du Dashboard
router.get('/:householdId/stats/summary', controller.getSummary.bind(controller));

// GET /households/:householdId/stats - page détail (3 blocs) sur une période
router.get('/:householdId/stats', controller.getStats.bind(controller));

export default router;
