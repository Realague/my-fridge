import { createContext, useContext, useState, ReactNode } from 'react';
import { Recipe, RecipeIngredient } from './RecipeContext';
import { useItemService, Item } from '@/services/itemService';
// import { useStorage } from './StorageContext'; // Removed - using new API stores

export interface MealPlanEntry {
  id: string;
  recipeId: string;
  date: string; // YYYY-MM-DD format
  mealType: 'breakfast' | 'lunch' | 'dinner';
  servings: number;
  createdAt: Date;
}

interface MealPlanContextType {
  mealPlans: MealPlanEntry[];
  addToMealPlan: (recipeId: string, date: string, mealType: 'breakfast' | 'lunch' | 'dinner', servings?: number) => void;
  removeMealPlan: (id: string) => void;
  getMealPlansForDate: (date: string) => MealPlanEntry[];
  getMealPlansForWeek: (startDate: string) => MealPlanEntry[];
  generateShoppingListFromMealPlan: (startDate: string, endDate: string, recipes: Recipe[], onItemsAdded: (items: Array<{item: Item, quantity: string, unit: string, source: string}>) => void) => void;
}

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

export const useMealPlan = () => {
  const context = useContext(MealPlanContext);
  if (!context) {
    throw new Error('useMealPlan must be used within a MealPlanProvider');
  }
  return context;
};

export const MealPlanProvider = ({ children }: { children: ReactNode }) => {
  const [mealPlans, setMealPlans] = useState<MealPlanEntry[]>([]);
  const itemService = useItemService();
  // Note: For now, we'll disable the storage check in meal planning
  // This would need to be updated to use the new stored items API

  const addToMealPlan = (recipeId: string, date: string, mealType: 'breakfast' | 'lunch' | 'dinner', servings = 1) => {
    const newMealPlan: MealPlanEntry = {
      id: Date.now().toString(),
      recipeId,
      date,
      mealType,
      servings,
      createdAt: new Date(),
    };
    setMealPlans(prev => [...prev, newMealPlan]);
  };

  const removeMealPlan = (id: string) => {
    setMealPlans(prev => prev.filter(plan => plan.id !== id));
  };

  const getMealPlansForDate = (date: string) => {
    return mealPlans.filter(plan => plan.date === date);
  };

  const getMealPlansForWeek = (startDate: string) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return mealPlans.filter(plan => {
      const planDate = new Date(plan.date);
      return planDate >= start && planDate <= end;
    });
  };

  const checkIngredientAvailability = async (ingredient: RecipeIngredient, neededQuantity: number) => {
    // TODO: Update this to use the new stored items API when needed
    // For now, we'll return null to disable the feature temporarily
    return null;
  };

  const generateShoppingListFromMealPlan = async (
    startDate: string, 
    endDate: string, 
    recipes: Recipe[],
    onItemsAdded: (items: Array<{item: Item, quantity: string, unit: string, source: string}>) => void
  ) => {
    const weekMealPlans = getMealPlansForWeek(startDate);
    const missingItems: Array<{item: Item, quantity: string, unit: string, source: string}> = [];
    
    // Group ingredients by item ID to calculate total needed quantities
    const ingredientTotals = new Map<string, { ingredient: RecipeIngredient, totalQuantity: number, recipes: string[] }>();

    weekMealPlans.forEach(mealPlan => {
      const recipe = recipes.find(r => r.id === mealPlan.recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach(ingredient => {
        const key = ingredient.itemId;
        const neededQuantity = ingredient.quantity * mealPlan.servings;
        
        if (ingredientTotals.has(key)) {
          const existing = ingredientTotals.get(key)!;
          existing.totalQuantity += neededQuantity;
          existing.recipes.push(recipe.title);
        } else {
          ingredientTotals.set(key, {
            ingredient,
            totalQuantity: neededQuantity,
            recipes: [recipe.title]
          });
        }
      });
    });

    // Check availability and create shopping list
    for (const [_, { ingredient, totalQuantity, recipes }] of ingredientTotals) {
      const availability = await checkIngredientAvailability(ingredient, totalQuantity);
      
      if (!availability || !availability.available) {
        try {
          const item = await itemService.getItemById(ingredient.itemId);
          // Skip items that are marked as excludeFromShopping (e.g., water)
          if (item && !item.excludeFromShopping) {
            const shortfall = availability?.shortfall || totalQuantity;
            missingItems.push({
              item,
              quantity: shortfall.toString(),
              unit: ingredient.unit,
              source: `Needed for: ${recipes.join(', ')}`
            });
          }
        } catch (error) {
          console.error('Failed to get item for shopping list:', error);
        }
      }
    }

    onItemsAdded(missingItems);
  };

  return (
    <MealPlanContext.Provider value={{
      mealPlans,
      addToMealPlan,
      removeMealPlan,
      getMealPlansForDate,
      getMealPlansForWeek,
      generateShoppingListFromMealPlan,
    }}>
      {children}
    </MealPlanContext.Provider>
  );
};
