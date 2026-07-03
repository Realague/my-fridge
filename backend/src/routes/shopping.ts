import { Router } from 'express';
import { ShoppingItemController } from '../controllers/ShoppingItemController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router({ mergeParams: true }); // mergeParams to access householdId from parent route
const shoppingItemController = new ShoppingItemController();

// Apply authentication middleware to all routes
router.use(authenticateGoogleToken);

// Routes for /api/households/:householdId/shopping

// GET /api/households/:householdId/shopping
// Query params: status ('to_buy' | 'to_store'), limit, offset
router.get('/', 
  shoppingItemController.getShoppingItems.bind(shoppingItemController)
);

// POST /api/households/:householdId/shopping
router.post('/',
  shoppingItemController.createShoppingItem.bind(shoppingItemController)
);

// GET /api/households/:householdId/shopping/:id
router.get('/:id', 
  shoppingItemController.getShoppingItemById.bind(shoppingItemController)
);

// PUT /api/households/:householdId/shopping/:id
router.put('/:id', 
  shoppingItemController.updateShoppingItem.bind(shoppingItemController)
);

// DELETE /api/households/:householdId/shopping/:id
router.delete('/:id', 
  shoppingItemController.deleteShoppingItem.bind(shoppingItemController)
);

// PATCH /api/households/:householdId/shopping/:id/status  { status: 'to_buy' | 'to_store' }
router.patch('/:id/status',
  shoppingItemController.updateShoppingItemStatus.bind(shoppingItemController)
);

// POST /api/households/:householdId/shopping/bulk-to-storage
router.post('/bulk-to-storage',
  shoppingItemController.bulkTransferToStorage.bind(shoppingItemController)
);

// PUT /api/households/:householdId/shopping/reorder
router.put('/reorder', 
  shoppingItemController.reorderItems.bind(shoppingItemController)
);

export default router; 