import { Router } from 'express';
import { BarcodeController } from '../controllers/BarcodeController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router({ mergeParams: true }); // mergeParams to access householdId from parent route
const barcodeController = new BarcodeController();

// All routes require authentication.
router.use(authenticateGoogleToken);

// Routes for /api/households/:householdId/barcode

// POST /api/households/:householdId/barcode/lookup  { barcode }
router.post('/lookup', barcodeController.lookup.bind(barcodeController));

// POST /api/households/:householdId/barcode/confirm  { barcode, itemId, format? }
router.post('/confirm', barcodeController.confirm.bind(barcodeController));

export default router;
