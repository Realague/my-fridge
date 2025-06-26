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
  };
}

export interface CreateRecipeIngredientDto {
  [x: string]: Key;
  itemId: string;
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
  const { apiCall } = useApiWithAuth();

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

    return await apiCall(`/api/recipes/${householdId}/recipes?${queryParams}`, {
      method: 'GET',
    });
  };

  const getRecipeById = async (householdId: string, recipeId: string): Promise<RecipeDto> => {
    return await apiCall(`/api/recipes/${householdId}/recipes/${recipeId}`, {
      method: 'GET',
    });
  };

  const createRecipe = async (householdId: string, recipeData: CreateRecipeDto): Promise<RecipeDto> => {
    return await apiCall(`/api/recipes/${householdId}/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recipeData),
    });
  };

  const updateRecipe = async (
    householdId: string,
    recipeId: string,
    updates: UpdateRecipeDto
  ): Promise<RecipeDto> => {
    return await apiCall(`/api/recipes/${householdId}/recipes/${recipeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
  };

  const deleteRecipe = async (householdId: string, recipeId: string): Promise<void> => {
    return await apiCall(`/api/recipes/${householdId}/recipes/${recipeId}`, {
      method: 'DELETE',
    });
  };

  const toggleFavorite = async (householdId: string, recipeId: string): Promise<RecipeDto> => {
    return await apiCall(`/api/recipes/${householdId}/recipes/${recipeId}/favorite`, {
      method: 'POST',
    });
  };

  const getFavoriteRecipes = async (householdId: string): Promise<RecipeListDto[]> => {
    return await apiCall(`/api/recipes/${householdId}/recipes/favorites`, {
      method: 'GET',
    });
  };

  const getAllTags = async (householdId: string): Promise<string[]> => {
    return await apiCall(`/api/recipes/${householdId}/recipes/tags`, {
      method: 'GET',
    });
  };

  const getRecipeStats = async (householdId: string): Promise<RecipeStats> => {
    return await apiCall(`/api/recipes/${householdId}/recipes/stats`, {
      method: 'GET',
    });
  };

  const getIngredientStats = async (householdId: string): Promise<IngredientStats[]> => {
    return await apiCall(`/api/recipes/${householdId}/recipes/ingredients/stats`, {
      method: 'GET',
    });
  };

  const getRecipesByUser = async (householdId: string, userId: string): Promise<RecipeListDto[]> => {
    return await apiCall(`/api/recipes/${householdId}/users/${userId}/recipes`, {
      method: 'GET',
    });
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