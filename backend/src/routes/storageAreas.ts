import { Router } from 'express';
import { StorageAreaController } from '../controllers/StorageAreaController';
import { StorageAreaService } from '../services/StorageAreaService';
import { StorageAreaRepository } from '../repositories/StorageAreaRepository';
import { HouseholdRepository } from '../repositories/HouseholdRepository';
import { authenticateGoogleToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

// Validation schemas for the middleware
const CreateStorageAreaSchema = { name: 'CreateStorageAreaDto' };
const UpdateStorageAreaSchema = { name: 'UpdateStorageAreaDto' };

// Dependency injection setup
const storageAreaRepository = new StorageAreaRepository();
const householdRepository = new HouseholdRepository();
const storageAreaService = new StorageAreaService(storageAreaRepository, householdRepository);
const storageAreaController = new StorageAreaController(storageAreaService);

const router = Router({ mergeParams: true }); // mergeParams to access householdId from parent route

// Apply authentication middleware to all routes
router.use(authenticateGoogleToken);

// Routes for /api/households/:householdId/storage-areas

// GET /api/households/:householdId/storage-areas
// Query params: limit, offset, sortBy, sortOrder, type
router.get('/', 
  storageAreaController.getStorageAreas.bind(storageAreaController)
);

// POST /api/households/:householdId/storage-areas
router.post('/', 
  validateRequest(CreateStorageAreaSchema),
  storageAreaController.createStorageArea.bind(storageAreaController)
);

// GET /api/households/:householdId/storage-areas/:id
router.get('/:id', 
  storageAreaController.getStorageAreaById.bind(storageAreaController)
);

// PUT /api/households/:householdId/storage-areas/:id
router.put('/:id',
  validateRequest(UpdateStorageAreaSchema),
  storageAreaController.updateStorageArea.bind(storageAreaController)
);

// DELETE /api/households/:householdId/storage-areas/:id
router.delete('/:id',
  storageAreaController.deleteStorageArea.bind(storageAreaController)
);

export default router; 