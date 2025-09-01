import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { mergeHeaders } from '@/utils/apiHeaders';

// Types matching backend DTOs
export interface CreateMealPlanDto {
  recipeId: string;
  date: string; // YYYY-MM-DD format
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings?: number;
  notes?: string;
}

export interface UpdateMealPlanDto {
  recipeId?: string;
  date?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings?: number;
  notes?: string;
}

export interface MealPlanDto {
  id: string;
  householdId: string;
  recipeId: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  recipe?: {
    id: string;
    title: string;
    description?: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    difficulty: string;
    tags?: string[];
  };
}

export interface ShoppingListItemDto {
  itemId: string;
  itemName: string;
  totalQuantity: number;
  unit: string;
  recipes: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Non-hook version for use in stores
export const createMealPlanApiService = () => {
  const makeApiCall = async (url: string, options: RequestInit = {}) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    const token = localStorage.getItem('google_token');
    if (!token) {
      throw new Error('No authentication token');
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: mergeHeaders(options.headers, true, token),
    };

    const response = await fetch(fullUrl, requestOptions);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response;
  };

  const createMealPlan = async (householdId: string, data: CreateMealPlanDto): Promise<MealPlanDto> => {
    const response = await makeApiCall(`/api/households/${householdId}/meal-plans`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    const result: ApiResponse<MealPlanDto> = await response.json();
    return result.data;
  };

  const getMealPlanById = async (householdId: string, id: string): Promise<MealPlanDto> => {
    const response = await makeApiCall(`/api/households/${householdId}/meal-plans/${id}`);
    const result: ApiResponse<MealPlanDto> = await response.json();
    return result.data;
  };

  const getMealPlansByDate = async (householdId: string, date: string): Promise<MealPlanDto[]> => {
    const response = await makeApiCall(`/api/households/${householdId}/meal-plans/by-date?date=${date}`);
    const result: ApiResponse<MealPlanDto[]> = await response.json();
    return result.data;
  };

  const getMealPlansByDateRange = async (householdId: string, startDate: string, endDate: string): Promise<MealPlanDto[]> => {
    const response = await makeApiCall(`/api/households/${householdId}/meal-plans/date-range?startDate=${startDate}&endDate=${endDate}`);
    const result: ApiResponse<MealPlanDto[]> = await response.json();
    return result.data;
  };

  const updateMealPlan = async (householdId: string, id: string, data: UpdateMealPlanDto): Promise<MealPlanDto> => {
    const response = await makeApiCall(`/api/households/${householdId}/meal-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    const result: ApiResponse<MealPlanDto> = await response.json();
    return result.data;
  };

  const deleteMealPlan = async (householdId: string, id: string): Promise<void> => {
    await makeApiCall(`/api/households/${householdId}/meal-plans/${id}`, {
      method: 'DELETE',
    });
  };

  const generateShoppingList = async (householdId: string, startDate: string, endDate: string): Promise<ShoppingListItemDto[]> => {
    const response = await makeApiCall(`/api/households/${householdId}/meal-plans/generate-shopping-list`, {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    });
    
    const result: ApiResponse<ShoppingListItemDto[]> = await response.json();
    return result.data;
  };

  return {
    createMealPlan,
    getMealPlanById,
    getMealPlansByDate,
    getMealPlansByDateRange,
    updateMealPlan,
    deleteMealPlan,
    generateShoppingList,
  };
};

// Hook version for use in React components
export const useMealPlanService = () => {
  const { get, post, put, delete: del } = useApiWithAuth();

  const createMealPlan = async (householdId: string, data: CreateMealPlanDto): Promise<MealPlanDto> => {
    const response = await post(`/api/households/${householdId}/meal-plans`, data);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create meal plan');
    }
    
    const result: ApiResponse<MealPlanDto> = await response.json();
    return result.data;
  };

  const getMealPlanById = async (householdId: string, id: string): Promise<MealPlanDto> => {
    const response = await get(`/api/households/${householdId}/meal-plans/${id}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get meal plan');
    }
    
    const result: ApiResponse<MealPlanDto> = await response.json();
    return result.data;
  };

  const getMealPlansByDate = async (householdId: string, date: string): Promise<MealPlanDto[]> => {
    const response = await get(`/api/households/${householdId}/meal-plans/by-date?date=${date}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get meal plans');
    }
    
    const result: ApiResponse<MealPlanDto[]> = await response.json();
    return result.data;
  };

  const getMealPlansByDateRange = async (householdId: string, startDate: string, endDate: string): Promise<MealPlanDto[]> => {
    const response = await get(`/api/households/${householdId}/meal-plans/date-range?startDate=${startDate}&endDate=${endDate}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get meal plans');
    }
    
    const result: ApiResponse<MealPlanDto[]> = await response.json();
    return result.data;
  };

  const updateMealPlan = async (householdId: string, id: string, data: UpdateMealPlanDto): Promise<MealPlanDto> => {
    const response = await put(`/api/households/${householdId}/meal-plans/${id}`, data);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update meal plan');
    }
    
    const result: ApiResponse<MealPlanDto> = await response.json();
    return result.data;
  };

  const deleteMealPlan = async (householdId: string, id: string): Promise<void> => {
    const response = await del(`/api/households/${householdId}/meal-plans/${id}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete meal plan');
    }
  };

  const generateShoppingList = async (householdId: string, startDate: string, endDate: string): Promise<ShoppingListItemDto[]> => {
    const response = await post(`/api/households/${householdId}/meal-plans/shopping-list`, { startDate, endDate });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate shopping list');
    }
    
    const result: ApiResponse<ShoppingListItemDto[]> = await response.json();
    return result.data;
  };

  return {
    createMealPlan,
    getMealPlanById,
    getMealPlansByDate,
    getMealPlansByDateRange,
    updateMealPlan,
    deleteMealPlan,
    generateShoppingList,
  };
}; 