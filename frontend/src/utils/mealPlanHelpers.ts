
import { Recipe, RecipeIngredient } from '@/contexts/RecipeContext';
import { StorageItem } from '@/contexts/StorageContext';
import { FoodItem } from '@/contexts/ItemContext';
import { MealPlanEntry } from '@/contexts/MealPlanContext';

export interface IngredientAnalysis {
  ingredient: string;
  needed: number;
  available: number;
  unit: string;
  missing: number;
  itemId?: string;
}

export const parseIngredientQuantity = (ingredient: string) => {
  // Enhanced regex to extract quantity and unit from ingredients like "2 lbs chicken breast"
  const patterns = [
    /^(\d+(?:\.\d+)?)\s*(lbs?|pounds?|lb)\s+(.+)$/i,
    /^(\d+(?:\.\d+)?)\s*(oz|ounces?|ounce)\s+(.+)$/i,
    /^(\d+(?:\.\d+)?)\s*(cups?|cup)\s+(.+)$/i,
    /^(\d+(?:\.\d+)?)\s*(tsp|teaspoons?|teaspoon)\s+(.+)$/i,
    /^(\d+(?:\.\d+)?)\s*(tbsp|tablespoons?|tablespoon)\s+(.+)$/i,
    /^(\d+(?:\.\d+)?)\s*(g|grams?|gram)\s+(.+)$/i,
    /^(\d+(?:\.\d+)?)\s*(kg|kilograms?|kilogram)\s+(.+)$/i,
    /^(\d+(?:\.\d+)?)\s*(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = ingredient.match(pattern);
    if (match) {
      return {
        quantity: parseFloat(match[1]),
        unit: match[2] || 'unit',
        name: match[3] || match[2]
      };
    }
  }

  // If no quantity found, assume 1 unit
  return {
    quantity: 1,
    unit: 'unit',
    name: ingredient
  };
};

export const findMatchingItems = (ingredientName: string, items: FoodItem[]) => {
  const normalizedIngredient = ingredientName.toLowerCase().trim();
  
  // First try exact match
  let exactMatch = items.find(item => 
    item.name.toLowerCase() === normalizedIngredient
  );
  if (exactMatch) return [exactMatch];

  // Then try fuzzy matching
  const fuzzyMatches = items.filter(item => {
    const itemName = item.name.toLowerCase();
    return itemName.includes(normalizedIngredient) || 
           normalizedIngredient.includes(itemName) ||
           itemName.split(' ').some(word => normalizedIngredient.includes(word));
  });

  return fuzzyMatches;
};

export const analyzeRecipeIngredients = (
  recipe: Recipe,
  items: FoodItem[],
  storageItems: StorageItem[],
  servings: number = 1
): IngredientAnalysis[] => {
  const servingMultiplier = servings / recipe.servings;
  
  return recipe.ingredients.map(ingredient => {
    // Now we work with structured ingredient data
    const neededQuantity = ingredient.quantity * servingMultiplier;
    
    // Find the item by ID since we have structured data
    const matchedItem = items.find(item => item.id === ingredient.itemId);
    let availableQuantity = 0;

    if (matchedItem) {
      // Find storage items for this food item
      const storageMatches = storageItems.filter(storage => storage.itemId === matchedItem.id);
      
      // Sum up available quantities (basic implementation - would need unit conversion)
      availableQuantity = storageMatches.reduce((sum, storage) => {
        if (storage.unit === ingredient.unit) {
          return sum + parseFloat(storage.quantity);
        }
        return sum; // Would need unit conversion here
      }, 0);
    }

    const missingQuantity = Math.max(0, neededQuantity - availableQuantity);

    return {
      ingredient: matchedItem?.name || 'Unknown item',
      needed: neededQuantity,
      available: availableQuantity,
      unit: ingredient.unit,
      missing: missingQuantity,
      itemId: ingredient.itemId
    };
  });
};

export const generateShoppingItemsFromAnalysis = (
  analysis: IngredientAnalysis[],
  items: FoodItem[]
): Array<{item: FoodItem, quantity: string, unit: string, source: string}> => {
  const shoppingItems: Array<{item: FoodItem, quantity: string, unit: string, source: string}> = [];

  analysis.forEach(ingredient => {
    if (ingredient.missing > 0) {
      let item: FoodItem | undefined;
      
      if (ingredient.itemId) {
        item = items.find(i => i.id === ingredient.itemId);
      } else {
        // Try to find or create a generic item
        item = items.find(i => i.name.toLowerCase().includes(ingredient.ingredient.toLowerCase()));
      }

      if (item) {
        shoppingItems.push({
          item,
          quantity: ingredient.missing.toString(),
          unit: ingredient.unit,
          source: 'Auto-added from meal plan'
        });
      }
    }
  });

  return shoppingItems;
};

export const generateShoppingListFromMealPlan = (
  mealPlans: MealPlanEntry[], 
  recipes: Recipe[], 
  items: FoodItem[],
  storageItems: StorageItem[]
): Array<{item: FoodItem, quantity: string, unit: string, source: string}> => {
  const shoppingItems: Array<{item: FoodItem, quantity: string, unit: string, source: string}> = [];
  const ingredientTotals = new Map<string, { ingredient: RecipeIngredient, totalQuantity: number, recipes: string[] }>();

  // Group ingredients by item ID to calculate total needed quantities
  mealPlans.forEach(mealPlan => {
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
  ingredientTotals.forEach(({ ingredient, totalQuantity, recipes }) => {
    const item = items.find(item => item.id === ingredient.itemId);
    if (!item) return;

    const storage = storageItems.find(storage => storage.itemId === ingredient.itemId);
    const availableQuantity = storage ? parseFloat(storage.quantity) : 0;
    
    if (availableQuantity < totalQuantity) {
      const shortfall = totalQuantity - availableQuantity;
      shoppingItems.push({
        item,
        quantity: shortfall.toString(),
        unit: ingredient.unit,
        source: `Needed for: ${recipes.join(', ')}`
      });
    }
  });

  return shoppingItems;
};
