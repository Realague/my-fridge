import { Router } from 'express';
import { LoyaltyCardController } from '../controllers/LoyaltyCardController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router({ mergeParams: true });
const loyaltyCardController = new LoyaltyCardController();

router.use(authenticateGoogleToken);

// GET /api/households/:householdId/loyalty-cards
router.get('/',
  loyaltyCardController.getLoyaltyCards.bind(loyaltyCardController)
);

// GET /api/households/:householdId/loyalty-cards/:id
router.get('/:id',
  loyaltyCardController.getLoyaltyCardById.bind(loyaltyCardController)
);

// POST /api/households/:householdId/loyalty-cards
router.post('/',
  loyaltyCardController.createLoyaltyCard.bind(loyaltyCardController)
);

// PUT /api/households/:householdId/loyalty-cards/:id
router.put('/:id',
  loyaltyCardController.updateLoyaltyCard.bind(loyaltyCardController)
);

// DELETE /api/households/:householdId/loyalty-cards/:id
router.delete('/:id',
  loyaltyCardController.deleteLoyaltyCard.bind(loyaltyCardController)
);

export default router;
