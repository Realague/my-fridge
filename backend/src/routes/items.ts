import { Router } from 'express';
import { ItemController } from '../controllers/ItemController';
import { validateRequest } from '../middleware/validation';
import { ItemRepository } from '../repositories/ItemRepository';
import { authenticateGoogleToken } from '../middleware/auth';

// Validation schemas for the middleware
const CreateItemSchema = { name: 'CreateItemDto' };
const UpdateItemSchema = { name: 'UpdateItemDto' };

const router = Router();
const itemController = new ItemController();

// Apply authentication middleware to all routes
router.use(authenticateGoogleToken);

// General item routes
router.get('/', 
  itemController.getItems.bind(itemController)
);

router.get('/search', 
  itemController.searchItems.bind(itemController)
);

router.get('/:id', 
  itemController.getItemById.bind(itemController)
);

router.get('/:id/recipe-count',
  itemController.getRecipeCount.bind(itemController)
);

// Household-specific routes
router.get('/household/:householdId', 
  itemController.getItemsByHousehold.bind(itemController)
);

// Protected routes (authentication required for modifying items)
router.post('/', 
  validateRequest(CreateItemSchema),
  itemController.createItem.bind(itemController)
);

router.put('/:id', 
  validateRequest(UpdateItemSchema),
  itemController.updateItem.bind(itemController)
);

router.delete('/:id', 
  itemController.deleteItem.bind(itemController)
);

export default router; 