import { Router } from 'express';
import { RecipeController } from '../controllers/RecipeController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const recipeController = new RecipeController();

// Apply authentication middleware to all routes
router.use(authenticateGoogleToken);

// Recipe CRUD operations
router.get('/:householdId/recipes', recipeController.getRecipes);
router.get('/:householdId/recipes/favorites', recipeController.getFavorites);
router.get('/:householdId/recipes/tags', recipeController.getTags);
router.get('/:householdId/recipes/stats', recipeController.getStats);
router.get('/:householdId/recipes/ingredients/stats', recipeController.getIngredientStats);
router.get('/:householdId/recipes/:id', recipeController.getRecipeById);
router.post('/:householdId/recipes', recipeController.createRecipe);
router.put('/:householdId/recipes/:id', recipeController.updateRecipe);
router.delete('/:householdId/recipes/:id', recipeController.deleteRecipe);
router.post('/:householdId/recipes/:id/favorite', recipeController.toggleFavorite);

// User-specific recipe routes
router.get('/:householdId/users/:userId/recipes', recipeController.getRecipesByUser);

export default router; 