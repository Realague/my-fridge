import { Router } from 'express';
import { BrandController } from '../controllers/BrandController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const brandController = new BrandController();

router.use(authenticateGoogleToken);

// GET /api/brands?search=&category=&isCurated=
router.get('/', brandController.getBrands.bind(brandController));

// GET /api/brands/:id
router.get('/:id', brandController.getBrandById.bind(brandController));

// POST /api/brands  (create custom brand, deduped)
router.post('/', brandController.createCustomBrand.bind(brandController));

export default router;
