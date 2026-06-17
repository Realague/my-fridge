export interface CreateMealDto {
  recipeId: string;
  servings?: number;
}

export interface UpdateMealDto {
  servings?: number;
}

export interface MealDto {
  id: string;
  householdId: string;
  recipeId: string;
  servings: number;
  position: number;
  createdAt: string;
  updatedAt: string;
  recipe?: {
    id: string;
    title: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    tags: string[];
    imageUrl?: string;
  };
}

export interface ShoppingListItemDto {
  itemId: string;
  itemName: string;
  totalQuantity: number;
  unit: string;
  recipes: string[];
}

export interface MealsAvailabilityItemDto {
  itemId: string;
  itemName: string;
  needed: number;
  inStock: number;
  missing: number;
  unit: string;
}

export interface MealsAvailabilityDto {
  totalIngredients: number;
  missingCount: number;
  inStockCount: number;
  expiringSoon: Array<{ itemId: string; itemName: string }>;
  items: MealsAvailabilityItemDto[];
}

export type RecipeAvailabilityStatus = 'haveAll' | 'missing' | 'usesExpiring';

export interface RecipeAvailabilityDto {
  recipeId: string;
  status: RecipeAvailabilityStatus;
  missingCount: number;
  expiringIngredients: string[];
}
