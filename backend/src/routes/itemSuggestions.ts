import { Router } from 'express';
import { ItemSuggestionController } from '../controllers/ItemSuggestionController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const itemSuggestionController = new ItemSuggestionController();

router.use(authenticateGoogleToken);

// GET /households/:householdId/item-suggestions — sectioned empty-state data
router.get('/:householdId/item-suggestions', itemSuggestionController.getSuggestions.bind(itemSuggestionController));

export default router;
