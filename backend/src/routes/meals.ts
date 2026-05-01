import { Router } from 'express';
import { MealController } from '../controllers/MealController';
import { authenticateGoogleToken } from '../middleware/auth';
import { validateMealCreate, validateMealUpdate } from '../middleware/validation';

const router = Router();
const mealController = new MealController();

router.use(authenticateGoogleToken);

// List meals for the household, ordered by position
router.get(
  '/households/:householdId/meals',
  mealController.getMeals.bind(mealController)
);

// Aggregated availability summary (must come before /:id route)
router.get(
  '/households/:householdId/meals/availability',
  mealController.getAvailability.bind(mealController)
);

// Shopping preview (must come before /:id route)
router.get(
  '/households/:householdId/meals/shopping-preview',
  mealController.getShoppingPreview.bind(mealController)
);

// Commit shopping list (apply selected items, merging with existing list)
router.post(
  '/households/:householdId/meals/commit-shopping',
  mealController.commitShopping.bind(mealController)
);

// Legacy aliases for cached PWA clients (auto-commit, no recap).
const legacyAutoCommit = mealController.legacyAutoCommit.bind(mealController);
router.post('/households/:householdId/meals/shopping-list', legacyAutoCommit);
router.post('/households/:householdId/meals/generate-shopping-list', legacyAutoCommit);
router.post('/households/:householdId/meal-plans/shopping-list', legacyAutoCommit);
router.post('/households/:householdId/meal-plans/generate-shopping-list', legacyAutoCommit);

// Create a meal (appended to the list)
router.post(
  '/households/:householdId/meals',
  validateMealCreate,
  mealController.createMeal.bind(mealController)
);

// Update a meal (servings only)
router.patch(
  '/households/:householdId/meals/:id',
  validateMealUpdate,
  mealController.updateMeal.bind(mealController)
);

// Delete a meal (positions are repacked after deletion)
router.delete(
  '/households/:householdId/meals/:id',
  mealController.deleteMeal.bind(mealController)
);

export default router;
