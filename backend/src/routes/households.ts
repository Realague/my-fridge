import { Router } from 'express';
import { HouseholdController } from '../controllers/HouseholdController';
import { HouseholdService } from '../services/HouseholdService';
import { HouseholdRepository } from '../repositories/HouseholdRepository';
import { UserRepository } from '../repositories/UserRepository';
import { StorageAreaRepository } from '../repositories/StorageAreaRepository';
import { authenticateGoogleToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import storageAreaRoutes from './storageAreas';
import shoppingRoutes from './shopping';

// Validation schemas for the middleware
const CreateHouseholdSchema = { name: 'CreateHouseholdDto' };
const UpdateHouseholdSchema = { name: 'UpdateHouseholdDto' };
const JoinHouseholdSchema = { name: 'JoinHouseholdDto' };

// Dependency injection setup
const householdRepository = new HouseholdRepository();
const userRepository = new UserRepository();
const storageAreaRepository = new StorageAreaRepository();
const householdService = new HouseholdService(householdRepository, userRepository, storageAreaRepository);
const householdController = new HouseholdController(householdService);

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateGoogleToken);

// Routes with proper validation
router.get('/', 
  householdController.getHouseholds.bind(householdController)
);

router.post('/', 
  validateRequest(CreateHouseholdSchema),
  householdController.createHousehold.bind(householdController)
);

router.get('/:id', 
  householdController.getHouseholdById.bind(householdController)
);

router.put('/:id',
  validateRequest(UpdateHouseholdSchema),
  householdController.updateHousehold.bind(householdController)
);

router.delete('/:id',
  householdController.deleteHousehold.bind(householdController)
);

router.post('/join',
  validateRequest(JoinHouseholdSchema),
  householdController.joinHousehold.bind(householdController)
);

router.post('/:id/leave',
  householdController.leaveHousehold.bind(householdController)
);

router.put('/:id/select',
  householdController.selectHousehold.bind(householdController)
);

// Nested routes for storage areas
router.use('/:householdId/storage-areas', storageAreaRoutes);

// Nested routes for shopping lists
router.use('/:householdId/shopping', shoppingRoutes);

export default router; 