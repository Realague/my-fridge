import { Router } from 'express';
import { MealPlanController } from '../controllers/MealPlanController';
import { authenticateGoogleToken } from '../middleware/auth';
import { validateMealPlan } from '../middleware/validation';

const router = Router();
const mealPlanController = new MealPlanController();

// All routes require authentication
router.use(authenticateGoogleToken);

// Create a new meal plan
router.post('/households/:householdId/meal-plans', 
  validateMealPlan,
  mealPlanController.createMealPlan.bind(mealPlanController)
);

// Get meal plans by date range (must come before /:id route)
router.get('/households/:householdId/meal-plans/date-range',
  mealPlanController.getMealPlansByDateRange.bind(mealPlanController)
);

// Get meal plans by specific date (must come before /:id route)
router.get('/households/:householdId/meal-plans/by-date',
  mealPlanController.getMealPlansByDate.bind(mealPlanController)
);

// Generate shopping list from meal plans (must come before /:id route)
router.post('/households/:householdId/meal-plans/generate-shopping-list',
  mealPlanController.generateShoppingList.bind(mealPlanController)
);

// Get a meal plan by ID (must come after specific routes)
router.get('/households/:householdId/meal-plans/:id',
  mealPlanController.getMealPlanById.bind(mealPlanController)
);

// Update a meal plan
router.put('/households/:householdId/meal-plans/:id',
  validateMealPlan,
  mealPlanController.updateMealPlan.bind(mealPlanController)
);

// Delete a meal plan
router.delete('/households/:householdId/meal-plans/:id',
  mealPlanController.deleteMealPlan.bind(mealPlanController)
);

export default router; 