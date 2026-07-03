import { Router } from 'express';
import { StoredItemController } from '../controllers/StoredItemController';
import { StockExitController } from '../controllers/StockExitController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const storedItemController = new StoredItemController();
const stockExitController = new StockExitController();

// All routes require authentication
router.use(authenticateGoogleToken);

// GET /households/:householdId/stored-items - Get all stored items for a household
router.get('/:householdId/stored-items', storedItemController.getStoredItems.bind(storedItemController));

// GET /households/:householdId/stored-items/expiring - Get expiring items
router.get('/:householdId/stored-items/expiring', storedItemController.getExpiringItems.bind(storedItemController));

// GET /households/:householdId/stored-items/expired - Get expired items
router.get('/:householdId/stored-items/expired', storedItemController.getExpiredItems.bind(storedItemController));

// GET /households/:householdId/stored-items/:id - Get a specific stored item
router.get('/:householdId/stored-items/:id', storedItemController.getStoredItemById.bind(storedItemController));

// POST /households/:householdId/stored-items - Create a new stored item
router.post('/:householdId/stored-items', storedItemController.createStoredItem.bind(storedItemController));

// PUT /households/:householdId/stored-items/:id - Update a stored item
router.put('/:householdId/stored-items/:id', storedItemController.updateStoredItem.bind(storedItemController));

// DELETE /households/:householdId/stored-items/:id - Delete a stored item
router.delete('/:householdId/stored-items/:id', storedItemController.deleteStoredItem.bind(storedItemController));

// POST /households/:householdId/stored-items/:id/consume-portion - Consume one portion (cooked meal)
router.post('/:householdId/stored-items/:id/consume-portion', storedItemController.consumePortion.bind(storedItemController));

// POST /households/:householdId/stored-items/:id/exit - Record a stock exit (consumed/wasted/removed)
router.post('/:householdId/stored-items/:id/exit', stockExitController.exitStoredItem.bind(stockExitController));

// GET /households/:householdId/storage-areas/:storageAreaId/stored-items - Get stored items by storage area
router.get('/:householdId/storage-areas/:storageAreaId/stored-items', storedItemController.getStoredItemsByStorageArea.bind(storedItemController));

// GET /households/:householdId/items/:itemId/total-quantity - Get total quantity of an item across all storage areas
router.get('/:householdId/items/:itemId/total-quantity', storedItemController.getTotalQuantityByItem.bind(storedItemController));

export default router; 