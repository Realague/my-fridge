import { Router } from 'express';
import { StockExitController } from '../controllers/StockExitController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const stockExitController = new StockExitController();

// All routes require authentication
router.use(authenticateGoogleToken);

// GET /households/:householdId/stock-exits/stats - Aggregated per-type counts (summary band)
router.get('/:householdId/stock-exits/stats', stockExitController.getStats.bind(stockExitController));

// GET /households/:householdId/stock-exits - Exit journal (most recent first)
router.get('/:householdId/stock-exits', stockExitController.listExits.bind(stockExitController));

// POST /households/:householdId/stock-exits/:exitId/undo - Undo a stock exit
router.post('/:householdId/stock-exits/:exitId/undo', stockExitController.undoExit.bind(stockExitController));

export default router;
