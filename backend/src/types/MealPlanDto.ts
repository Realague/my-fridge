export interface CreateMealPlanDto {
  recipeId: string;
  date: string; // YYYY-MM-DD format
  mealType: 'breakfast' | 'lunch' | 'dinner';
  servings?: number;
  notes?: string;
}

export interface UpdateMealPlanDto {
  recipeId?: string;
  date?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
  servings?: number;
  notes?: string;
}

export interface MealPlanDto {
  id: string;
  householdId: string;
  recipeId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  servings: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  recipe?: {
    id: string;
    title: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    difficulty: string;
  };
}

export interface MealPlanQueryParams {
  startDate?: string;
  endDate?: string;
  date?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
  recipeId?: string;
  limit?: number;
  offset?: number;
}

export interface MealPlanShoppingListDto {
  startDate: string;
  endDate: string;
}

export interface ShoppingListItemDto {
  itemId: string;
  itemName: string;
  totalQuantity: number;
  unit: string;
  recipes: string[];
} 