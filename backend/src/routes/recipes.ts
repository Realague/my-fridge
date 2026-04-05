import { Router } from 'express';
import { RecipeController } from '../controllers/RecipeController';
import { authenticateGoogleToken } from '../middleware/auth';

const router = Router();
const recipeController = new RecipeController();

// Apply authentication middleware to all routes
router.use(authenticateGoogleToken);

// Recipe CRUD operations
router.get('/households/:householdId/recipes', recipeController.getRecipes);
router.get('/households/:householdId/recipes/favorites', recipeController.getFavorites);
router.get('/households/:householdId/recipes/tags', recipeController.getTags);
router.get('/households/:householdId/recipes/stats', recipeController.getStats);
router.get('/households/:householdId/ingredients/stats', recipeController.getIngredientStats);
router.get('/households/:householdId/recipes/:id', recipeController.getRecipeById);
router.post('/households/:householdId/recipes/', recipeController.createRecipe);
router.put('/households/:householdId/recipes/:id', recipeController.updateRecipe);
router.delete('/households/:householdId/recipes/:id', recipeController.deleteRecipe);
router.post('/households/:householdId/recipes/:id/favorite', recipeController.toggleFavorite);

// Consume ingredients
router.get('/households/:householdId/recipes/:id/consume-preview', recipeController.getConsumePreview);
router.post('/households/:householdId/recipes/:id/consume', recipeController.consumeIngredients);

// User-specific recipe routes
router.get('/households/:householdId/users/:userId/recipes', recipeController.getRecipesByUser);

export default router; 