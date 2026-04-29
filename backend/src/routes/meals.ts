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

// Generate shopping list from current meals (must come before /:id route)
router.post(
  '/households/:householdId/meals/generate-shopping-list',
  mealController.generateShoppingList.bind(mealController)
);

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
