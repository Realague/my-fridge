import { Router } from 'express';
import { HouseholdActivityController } from '../controllers/HouseholdActivityController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const controller = new HouseholdActivityController();

router.use(authenticateGoogleToken);

// GET /households/:householdId/activities/recent - 5 dernières (Dashboard)
router.get('/:householdId/activities/recent', controller.getRecent.bind(controller));

// GET /households/:householdId/activities - feed paginé keyset
router.get('/:householdId/activities', controller.getFeed.bind(controller));

export default router;
