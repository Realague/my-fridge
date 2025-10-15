import { Router } from 'express';
import { ItemMinimumController } from '../controllers/ItemMinimumController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router({ mergeParams: true });
const itemMinimumController = new ItemMinimumController();

// Apply authentication middleware to all routes
router.use(authenticateGoogleToken);

// Routes for /api/households/:householdId/item-minimums

// GET /api/households/:householdId/item-minimums
router.get('/', 
  itemMinimumController.getItemMinimums.bind(itemMinimumController)
);

// GET /api/households/:householdId/item-minimums/low-stock
router.get('/low-stock', 
  itemMinimumController.getLowStockItems.bind(itemMinimumController)
);

// GET /api/households/:householdId/item-minimums/:id
router.get('/:id', 
  itemMinimumController.getItemMinimumById.bind(itemMinimumController)
);

// POST /api/households/:householdId/item-minimums
router.post('/',
  itemMinimumController.createItemMinimum.bind(itemMinimumController)
);

// PUT /api/households/:householdId/item-minimums/:id
router.put('/:id', 
  itemMinimumController.updateItemMinimum.bind(itemMinimumController)
);

// DELETE /api/households/:householdId/item-minimums/:id
router.delete('/:id', 
  itemMinimumController.deleteItemMinimum.bind(itemMinimumController)
);

export default router;
