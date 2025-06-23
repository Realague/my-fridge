import { Router } from 'express';
import { ItemController } from '../controllers/ItemController';
import { validateRequest } from '../middleware/validation';
import { ItemRepository } from '../repositories/ItemRepository';
import { ItemSeeder } from '../seeders/defaultItems';
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

// Seeding endpoint (admin-only in production)
router.post('/seed', async (req, res) => {
  try {
    const itemRepository = new ItemRepository();
    const itemSeeder = new ItemSeeder(itemRepository);
    
    await itemSeeder.seedBasicItems();
    
    res.status(200).json({
      success: true,
      message: 'Basic items seeded successfully',
    });
  } catch (error) {
    console.error('Error seeding items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed items',
    });
  }
});

export default router; 