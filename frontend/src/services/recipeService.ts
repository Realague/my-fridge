
import { useApiWithAuth } from '@/hooks/useApiWithAuth';

export type RecipeDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface RecipeStep {
  text: string;
  duration?: number | null;
}

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
  instructions: RecipeStep[];
  tags: string[];
  imageUrl?: string;
  sourceUrl?: string;
  ingredients: CreateRecipeIngredientDto[];
}

export interface UpdateRecipeDto {
  title?: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: RecipeDifficulty;
  instructions?: RecipeStep[];
  tags?: string[];
  imageUrl?: string;
  sourceUrl?: string;
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
  instructions: RecipeStep[];
  tags: string[];
  imageUrl: string | null;
  sourceUrl: string | null;
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
  imageUrl: string | null;
  sourceUrl: string | null;
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

export interface ParsedIngredient {
  originalText: string;
  quantity: number | null;
  unit: string | null;
  itemName: string;
}

export interface IngredientMatch {
  itemId: string;
  itemName: string;  // Original name in DB
  translatedName: string;  // Translated name for display
  category: string;
  defaultUnit: string;
  availableUnits: string[];
  confidence: number;  // 0-1 score
}

export interface MatchedIngredient {
  parsed: ParsedIngredient;
  matches: IngredientMatch[];
  bestMatch: IngredientMatch | null;
}

export interface ConsumePreviewStoredItem {
  storedItemId: string;
  storageAreaId: string;
  storageAreaName: string;
  storageAreaEmoji: string | null;
  quantity: number;
  unit: string;
  normalizedQuantity: number;
  normalizedUnit: string;
  expirationDate: string | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export interface SuggestedDeduction {
  storedItemId: string;
  quantity: number;
  unit: string;
}

export interface ConsumePreviewIngredient {
  recipeIngredientId: string;
  itemId: string;
  itemName: string;
  itemCategory: string;
  requiredQuantity: number;
  requiredUnit: string;
  originalQuantity: number;
  originalUnit: string;
  availableStoredItems: ConsumePreviewStoredItem[];
  totalAvailable: number;
  totalAvailableUnit: string;
  hasEnough: boolean;
  canCompare: boolean;
  suggestedDeductions: SuggestedDeduction[];
}

export interface ConsumePreviewResult {
  recipeId: string;
  recipeTitle: string;
  recipeServings: number;
  requestedServings: number;
  ingredients: ConsumePreviewIngredient[];
}

export interface ConsumeDeduction {
  storedItemId: string;
  quantity: number;
  unit: string;
}

export interface ConsumeResultItem {
  storedItemId: string;
  itemName: string;
  quantityDeducted: number;
  unit: string;
  remainingQuantity: number | null;
  deleted: boolean;
}

export interface ConsumeResult {
  consumed: ConsumeResultItem[];
}

export interface ParsedMarmitonRecipe {
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  instructions: RecipeStep[];
  ingredients: string[];
  matchedIngredients: MatchedIngredient[];
  imageUrl: string | null;
  sourceUrl: string;
  ingredientStepMapping?: { [ingredientIndex: number]: number[] };
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

  const getConsumePreview = async (
    householdId: string,
    recipeId: string,
    servings?: number
  ): Promise<ConsumePreviewResult> => {
    const params = servings !== undefined ? `?servings=${servings}` : '';
    const response = await makeApiCall(
      `/api/recipes/${householdId}/recipes/${recipeId}/consume-preview${params}`,
      { method: 'GET' }
    );
    const data = await response.json();
    return data.data || data;
  };

  const consumeIngredients = async (
    householdId: string,
    recipeId: string,
    deductions: ConsumeDeduction[]
  ): Promise<ConsumeResult> => {
    const response = await makeApiCall(
      `/api/recipes/${householdId}/recipes/${recipeId}/consume`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deductions }),
      }
    );
    const data = await response.json();
    return data.data || data;
  };

  const importFromMarmiton = async (url: string): Promise<ParsedMarmitonRecipe> => {
    const response = await makeApiCall('/api/import/marmiton', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: { url },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to import recipe' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
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
    importFromMarmiton,
    getConsumePreview,
    consumeIngredients,
  };
};
