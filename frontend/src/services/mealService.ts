import { makeAuthenticatedApiCall } from '@/utils/apiAuth';

export interface CreateMealDto {
  recipeId: string;
  servings?: number;
}

export interface UpdateMealDto {
  servings: number;
}

export interface MealRecipeSummary {
  id: string;
  title: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  tags: string[];
  imageUrl?: string;
}

export interface MealDto {
  id: string;
  householdId: string;
  recipeId: string;
  servings: number;
  position: number;
  createdAt: string;
  updatedAt: string;
  recipe?: MealRecipeSummary;
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
  onShoppingListCount: number;
  expiringSoon: Array<{ itemId: string; itemName: string }>;
  items: MealsAvailabilityItemDto[];
}

export interface ShoppingListItemDto {
  itemId: string;
  itemName: string;
  totalQuantity: number;
  unit: string;
  recipes: string[];
}

export interface ShoppingPreviewItemDto {
  itemId: string;
  itemName: string;
  itemCategory: string;
  itemHouseholdId: string | null;
  itemImageUrl: string | null;
  needed: number;
  inStock: number;
  toBuy: number;
  unit: string;
  recipes: string[];
  existingShoppingQty: number;
  shoppingItemId?: string;
}

export interface ShoppingPreviewDto {
  toBuy: ShoppingPreviewItemDto[];
  inStock: ShoppingPreviewItemDto[];
  inShoppingList: ShoppingPreviewItemDto[];
  basics: ShoppingPreviewItemDto[];
}

export interface CommitShoppingItemInputDto {
  itemId: string;
  quantity: number;
  unit: string;
  recipes: string[];
}

export interface CommitShoppingMergeDto {
  newItems: ShoppingListItemDto[];
  mergedItems: Array<ShoppingListItemDto & { previousQuantity: number }>;
  alreadyCoveredItems: ShoppingListItemDto[];
}

// ——— Meal removal impact ———

export interface MealRemovalShoppingItemDto {
  shoppingItemId: string;
  itemId: string;
  itemName: string;
  itemHouseholdId: string | null;
  itemImageUrl: string | null;
  unit: string;
  currentQuantity: number;
  reductionQuantity: number;
  remainingQuantity: number;
  otherRecipes?: string[];
  isCompleted?: boolean;
}

export interface MealRemovalNoImpactItemDto {
  itemId: string;
  itemName: string;
  itemHouseholdId: string | null;
  itemImageUrl: string | null;
  needed: number;
  unit: string;
}

export interface MealRemovalImpactDto {
  mealId: string;
  recipeTitle: string;
  toRemove: MealRemovalShoppingItemDto[];
  toReduce: MealRemovalShoppingItemDto[];
  alreadyPurchased: MealRemovalShoppingItemDto[];
  noImpact: MealRemovalNoImpactItemDto[];
}

export type MealRemovalActionType = 'remove' | 'reduce' | 'keep';

export interface MealRemovalActionDto {
  shoppingItemId: string;
  action: MealRemovalActionType;
  newQuantity?: number;
}

export type RecipeAvailabilityStatus = 'haveAll' | 'missing' | 'usesExpiring';

export interface RecipeAvailabilityDto {
  recipeId: string;
  status: RecipeAvailabilityStatus;
  missingCount: number;
  expiringIngredients: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const apiCall = async (
  url: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {}
) => {
  const response = await makeAuthenticatedApiCall(url, options as any, { showToast: false });
  if (!response.ok && response.status !== 204) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response;
};

export const mealService = {
  async listMeals(householdId: string): Promise<MealDto[]> {
    const response = await apiCall(`/api/households/${householdId}/meals`);
    const result: ApiResponse<MealDto[]> = await response.json();
    return result.data;
  },

  async addMeal(householdId: string, data: CreateMealDto): Promise<MealDto> {
    const response = await apiCall(`/api/households/${householdId}/meals`, {
      method: 'POST',
      body: data,
    });
    const result: ApiResponse<MealDto> = await response.json();
    return result.data;
  },

  async updateMeal(householdId: string, id: string, data: UpdateMealDto): Promise<MealDto> {
    const response = await apiCall(`/api/households/${householdId}/meals/${id}`, {
      method: 'PATCH',
      body: data,
    });
    const result: ApiResponse<MealDto> = await response.json();
    return result.data;
  },

  async removeMeal(householdId: string, id: string): Promise<void> {
    await apiCall(`/api/households/${householdId}/meals/${id}`, { method: 'DELETE' });
  },

  async getAvailability(householdId: string): Promise<MealsAvailabilityDto> {
    const response = await apiCall(`/api/households/${householdId}/meals/availability`);
    const result: ApiResponse<MealsAvailabilityDto> = await response.json();
    return result.data;
  },

  async getShoppingPreview(householdId: string): Promise<ShoppingPreviewDto> {
    const response = await apiCall(`/api/households/${householdId}/meals/shopping-preview`);
    const result: ApiResponse<ShoppingPreviewDto> = await response.json();
    return result.data;
  },

  async commitShopping(
    householdId: string,
    items: CommitShoppingItemInputDto[]
  ): Promise<CommitShoppingMergeDto> {
    const response = await apiCall(
      `/api/households/${householdId}/meals/commit-shopping`,
      { method: 'POST', body: { items } }
    );
    const result: ApiResponse<CommitShoppingMergeDto> = await response.json();
    return result.data;
  },

  async getRecipesAvailability(householdId: string): Promise<RecipeAvailabilityDto[]> {
    const response = await apiCall(`/api/households/${householdId}/recipes/availability`);
    const result: ApiResponse<RecipeAvailabilityDto[]> = await response.json();
    return result.data;
  },

  async getRemovalImpact(householdId: string, mealId: string): Promise<MealRemovalImpactDto> {
    const response = await apiCall(
      `/api/households/${householdId}/meals/${mealId}/removal-impact`
    );
    const result: ApiResponse<MealRemovalImpactDto> = await response.json();
    return result.data;
  },

  async confirmRemoval(
    householdId: string,
    mealId: string,
    actions: MealRemovalActionDto[]
  ): Promise<void> {
    await apiCall(`/api/households/${householdId}/meals/${mealId}/confirm-removal`, {
      method: 'POST',
      body: { actions },
    });
  },
};
