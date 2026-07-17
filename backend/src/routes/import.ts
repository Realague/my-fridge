import { Router } from 'express';
import { RecipeImportController } from '../controllers/RecipeImportController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const recipeImportController = new RecipeImportController();

// Apply authentication middleware to all routes
router.use(authenticateGoogleToken);

// Generic Schema.org-based import: works for any allowed source domain.
router.post('/import/recipe', recipeImportController.importRecipe);

// Legacy endpoint kept for older clients; same pipeline underneath.
router.post('/import/marmiton', recipeImportController.importRecipe);

export default router;
