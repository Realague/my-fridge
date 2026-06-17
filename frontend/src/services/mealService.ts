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

  async generateShoppingList(householdId: string): Promise<ShoppingListItemDto[]> {
    const response = await apiCall(
      `/api/households/${householdId}/meals/generate-shopping-list`,
      { method: 'POST' }
    );
    const result: ApiResponse<ShoppingListItemDto[]> = await response.json();
    return result.data;
  },

  async getRecipesAvailability(householdId: string): Promise<RecipeAvailabilityDto[]> {
    const response = await apiCall(`/api/households/${householdId}/recipes/availability`);
    const result: ApiResponse<RecipeAvailabilityDto[]> = await response.json();
    return result.data;
  },
};
