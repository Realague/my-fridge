
import { useApiWithAuth } from '@/hooks/useApiWithAuth';

export type RecipeDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface RecipeIngredientDto {
  id: string;
  itemId: string;
  quantity: number;
  unit: string;
  notes?: string;
  usedInSteps?: number[];
  item?: {
    id: string;
    name: string;
    category: string;
    defaultUnit: string;
    availableUnits: string[];
    householdId?: string;
  };
}

export interface CreateRecipeIngredientDto {
  itemId: string;  // Removed the Key type which was causing the error
  quantity: number;
  unit: string;
  notes?: string;
  usedInSteps?: number[];
}

export interface CreateRecipeDto {
  title: string;
  description?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  instructions: string[];
  tags: string[];
  image?: string;
  ingredients: CreateRecipeIngredientDto[];
}

export interface UpdateRecipeDto {
  title?: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: RecipeDifficulty;
  instructions?: string[];
  tags?: string[];
  image?: string;
  isFavorite?: boolean;
  ingredients?: CreateRecipeIngredientDto[];
}

export interface RecipeDto {
  id: string;
  title: string;
  description: string | null;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  instructions: string[];
  tags: string[];
  image: string | null;
  isFavorite: boolean;
  householdId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredientDto[];
  creator?: {
    id: string;
    displayName: string;
    email: string;
  };
}

export interface RecipeListDto {
  id: string;
  title: string;
  description: string | null;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  tags: string[];
  image: string | null;
  isFavorite: boolean;
  createdBy: string;
  createdAt: string;
  ingredientCount: number;
  creator?: {
    id: string;
    displayName: string;
  };
}

export interface RecipeSearchParams {
  search?: string;
  difficulty?: RecipeDifficulty;
  tags?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  maxTotalTime?: number;
  isFavorite?: boolean;
  createdBy?: string;
  limit?: number;
  offset?: number;
}

export interface RecipeStats {
  totalRecipes: number;
  favoriteRecipes: number;
  difficultyBreakdown: { [key: string]: number };
}

export interface IngredientStats {
  itemId: string;
  itemName: string;
  usageCount: number;
  totalQuantity: number;
}

export const useRecipeService = () => {
  const { makeApiCall } = useApiWithAuth();

  const getRecipes = async (
    householdId: string,
    params: RecipeSearchParams = {}
  ): Promise<{ recipes: RecipeListDto[]; total: number; hasMore: boolean }> => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    const response = await makeApiCall(`/api/recipes/${householdId}/recipes?${queryParams}`, {
      method: 'GET',
    });
    return response.json();
  };

  const getRecipeById = async (householdId: string, recipeId: string): Promise<RecipeDto> => {
    const response = await makeApiCall(`/api/recipes/${householdId}/recipes/${recipeId}`, {
      method: 'GET',
    });
    return response.json();
  };

  const createRecipe = async (householdId: string, recipeData: CreateRecipeDto): Promise<RecipeDto> => {
    const response = await makeApiCall(`/api/recipes/${householdId}/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recipeData),
    });
    return response.json();
  };

  const updateRecipe = async (
    householdId: string,
    recipeId: string,
    updates: UpdateRecipeDto
  ): Promise<RecipeDto> => {
    const response = await makeApiCall(`/api/recipes/${householdId}/recipes/${recipeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    return response.json();
  };

  const deleteRecipe = async (householdId: string, recipeId: string): Promise<void> => {
    await makeApiCall(`/api/recipes/${householdId}/recipes/${recipeId}`, {
      method: 'DELETE',
    });
  };

  const toggleFavorite = async (householdId: string, recipeId: string): Promise<RecipeDto> => {
    const response = await makeApiCall(`/api/recipes/${householdId}/recipes/${recipeId}/favorite`, {
      method: 'POST',
    });
    return response.json();
  };

  const getFavoriteRecipes = async (householdId: string): Promise<RecipeListDto[]> => {
    const response = await makeApiCall(`/api/recipes/${householdId}/recipes/favorites`, {
      method: 'GET',
    });
    return response.json();
  };

  const getAllTags = async (householdId: string): Promise<string[]> => {
    const response = await makeApiCall(`/api/recipes/${householdId}/recipes/tags`, {
      method: 'GET',
    });
    return response.json();
  };

  const getRecipeStats = async (householdId: string): Promise<RecipeStats> => {
    const response = await makeApiCall(`/api/recipes/${householdId}/recipes/stats`, {
      method: 'GET',
    });
    return response.json();
  };

  const getIngredientStats = async (householdId: string): Promise<IngredientStats[]> => {
    const response = await makeApiCall(`/api/recipes/${householdId}/recipes/ingredients/stats`, {
      method: 'GET',
    });
    return response.json();
  };

  const getRecipesByUser = async (householdId: string, userId: string): Promise<RecipeListDto[]> => {
    const response = await makeApiCall(`/api/recipes/${householdId}/users/${userId}/recipes`, {
      method: 'GET',
    });
    return response.json();
  };

  return {
    getRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    toggleFavorite,
    getFavoriteRecipes,
    getAllTags,
    getRecipeStats,
    getIngredientStats,
    getRecipesByUser,
  };
};
