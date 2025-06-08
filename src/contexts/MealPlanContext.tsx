
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Recipe } from './RecipeContext';
import { useItems } from './ItemContext';
import { useStorage } from './StorageContext';

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
  generateShoppingListFromMealPlan: (startDate: string, endDate: string, onItemsAdded: (items: Array<{item: any, quantity: string, unit: string, source: string}>) => void) => void;
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
  const { getItemByName, items } = useItems();
  const { storageItems, getItemById } = useStorage();

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

  const findMatchingStorageItem = (ingredient: string) => {
    // First try exact match
    const exactMatch = items.find(item => 
      item.name.toLowerCase() === ingredient.toLowerCase()
    );
    if (exactMatch) {
      return storageItems.find(storage => storage.itemId === exactMatch.id);
    }

    // Then try fuzzy matching
    const fuzzyMatch = items.find(item => {
      const itemName = item.name.toLowerCase();
      const ingredientName = ingredient.toLowerCase();
      return itemName.includes(ingredientName) || ingredientName.includes(itemName);
    });
    if (fuzzyMatch) {
      return storageItems.find(storage => storage.itemId === fuzzyMatch.id);
    }

    return null;
  };

  const parseIngredientQuantity = (ingredient: string) => {
    // Simple regex to extract quantity and unit from ingredients like "2 lbs chicken breast"
    const match = ingredient.match(/^(\d+(?:\.\d+)?)\s*(\w+)\s+(.+)$/);
    if (match) {
      return {
        quantity: parseFloat(match[1]),
        unit: match[2],
        name: match[3]
      };
    }
    // If no quantity found, assume 1 unit
    return {
      quantity: 1,
      unit: 'unit',
      name: ingredient
    };
  };

  const generateShoppingListFromMealPlan = (
    startDate: string, 
    endDate: string, 
    onItemsAdded: (items: Array<{item: any, quantity: string, unit: string, source: string}>) => void
  ) => {
    const weekMealPlans = getMealPlansForWeek(startDate);
    const missingItems: Array<{item: any, quantity: string, unit: string, source: string}> = [];

    weekMealPlans.forEach(mealPlan => {
      // Note: We'll need to get the recipe from RecipeContext
      // For now, we'll structure this to be called with recipes passed in
    });

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
