import { create } from 'zustand';
import { 
  RecipeDto, 
  RecipeListDto, 
  CreateRecipeDto, 
  UpdateRecipeDto, 
  RecipeSearchParams,
  RecipeStats,
  IngredientStats
} from '@/services/recipeService';
import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { useHouseholdStore } from './householdStore';

// Non-hook API service for use in stores
const createApiService = () => {
  const makeApiCall = async (url: string, options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: any; headers?: Record<string, string>; } = {}) => {
    const response = await makeAuthenticatedApiCall(url, options, {
      showToast: false // Let individual stores handle their own error messaging
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response;
  };

  return {
    get: (url: string, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'GET', headers }),
    post: (url: string, body?: any, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'POST', body, headers }),
    put: (url: string, body?: any, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'PUT', body, headers }),
    delete: (url: string, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'DELETE', headers }),
  };
};

const getHouseholdId = (providedId?: string): string | null => {
  if (providedId) return providedId;
  
  // Get from household store
  const selectedHouseholdId = useHouseholdStore.getState().selectedHouseholdId;
  if (selectedHouseholdId) return selectedHouseholdId;
  
  // Check if user has any households
  const households = useHouseholdStore.getState().households;
  if (households.length > 0) {
    return households[0].id; // Use first household if none selected
  }
  
  return null; // No household available
};

const apiService = createApiService();

interface RecipeState {
  // Data
  recipes: RecipeListDto[];
  currentRecipe: RecipeDto | null;
  favoriteRecipes: RecipeListDto[];
  tags: string[];
  stats: RecipeStats | null;
  ingredientStats: IngredientStats[];
  
  // Meta
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  
  // Search/Filter state
  searchParams: RecipeSearchParams;
  
  // Actions
  fetchRecipes: (params?: RecipeSearchParams) => Promise<void>;
  fetchRecipeById: (recipeId: string) => Promise<void>;
  createRecipe: (recipeData: CreateRecipeDto) => Promise<RecipeDto>;
  updateRecipe: (recipeId: string, updates: UpdateRecipeDto) => Promise<RecipeDto>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  toggleFavorite: (recipeId: string) => Promise<RecipeDto>;
  fetchFavoriteRecipes: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchIngredientStats: () => Promise<void>;
  getRecipesByUser: (userId: string) => Promise<RecipeListDto[]>;
  setSearchParams: (params: RecipeSearchParams) => void;
  clearCurrentRecipe: () => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  recipes: [],
  currentRecipe: null,
  favoriteRecipes: [],
  tags: [],
  stats: null,
  ingredientStats: [],
  loading: false,
  error: null,
  hasMore: false,
  total: 0,
  searchParams: {},
};

export const useRecipeStore = create<RecipeState>((set, get) => ({
  ...initialState,

  fetchRecipes: async (params: RecipeSearchParams = {}) => {
    set({ loading: true, error: null });
    
    try {
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

      const householdId = getHouseholdId();
      if (!householdId) {
        throw new Error('No household available');
      }

      const response = await apiService.get(`/api/households/${householdId}/recipes?${queryParams}`);
      const responseData = await response.json();
      
      // Handle backend response structure: { success: true, data: { recipes, total, hasMore } }
      const result = responseData.data || responseData;
      const recipes = result.recipes || result || [];
      const total = result.total || recipes.length;
      const hasMore = result.hasMore || false;
      
      set({
        recipes,
        total,
        hasMore,
        searchParams: params,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch recipes',
        loading: false,
      });
    }
  },

  fetchRecipeById: async (recipeId: string) => {
    set({ loading: true, error: null });
    
    try {
      const householdId = getHouseholdId();
      if (!householdId) {
        throw new Error('No household available');
      }

      const response = await apiService.get(`/api/households/${householdId}/recipes/${recipeId}`);
      const responseData = await response.json();
      const recipe = responseData.data || responseData;
      set({
        currentRecipe: recipe,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch recipe',
        loading: false,
      });
    }
  },

  createRecipe: async (recipeData: CreateRecipeDto) => {
    set({ loading: true, error: null });
    
    try {
      const householdId = getHouseholdId();
      if (!householdId) {
        throw new Error('No household available');
      }

      const response = await apiService.post(`/api/households/${householdId}/recipes`, recipeData);
      const responseData = await response.json();
      const newRecipe = responseData.data || responseData;
      
      // Add to recipes list
      const { recipes, total } = get();
      const newRecipeListItem: RecipeListDto = {
        id: newRecipe.id,
        title: newRecipe.title,
        description: newRecipe.description,
        prepTime: newRecipe.prepTime,
        cookTime: newRecipe.cookTime,
        totalTime: newRecipe.totalTime,
        servings: newRecipe.servings,
        difficulty: newRecipe.difficulty,
        tags: newRecipe.tags,
        imageUrl: newRecipe.imageUrl,
        isFavorite: newRecipe.isFavorite,
        createdBy: newRecipe.createdBy,
        createdAt: newRecipe.createdAt,
        ingredientCount: newRecipe.ingredients.length,
        creator: newRecipe.creator,
        sourceUrl: newRecipe.sourceUrl,
      };
      
      set({
        recipes: [newRecipeListItem, ...recipes],
        currentRecipe: newRecipe,
        total: total + 1,
        loading: false,
      });
      
      return newRecipe;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create recipe',
        loading: false,
      });
      throw error;
    }
  },

  updateRecipe: async (recipeId: string, updates: UpdateRecipeDto) => {
    set({ loading: true, error: null });
    
    try {
      const householdId = getHouseholdId();
      if (!householdId) {
        throw new Error('No household available');
      }

      const response = await apiService.put(`/api/households/${householdId}/recipes/${recipeId}`, updates);
      const responseData = await response.json();
      const updatedRecipe = responseData.data || responseData;
      
      // Update in recipes list
      const { recipes } = get();
      const updatedRecipes = recipes.map(recipe =>
        recipe.id === recipeId
          ? {
              ...recipe,
              title: updatedRecipe.title,
              description: updatedRecipe.description,
              prepTime: updatedRecipe.prepTime,
              cookTime: updatedRecipe.cookTime,
              totalTime: updatedRecipe.totalTime,
              servings: updatedRecipe.servings,
              difficulty: updatedRecipe.difficulty,
              tags: updatedRecipe.tags,
              image: updatedRecipe.image,
              isFavorite: updatedRecipe.isFavorite,
              ingredientCount: updatedRecipe.ingredients.length,
            }
          : recipe
      );
      
      set({
        recipes: updatedRecipes,
        currentRecipe: updatedRecipe,
        loading: false,
      });
      
      return updatedRecipe;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update recipe',
        loading: false,
      });
      throw error;
    }
  },

  deleteRecipe: async (recipeId: string) => {
    set({ loading: true, error: null });
    
    try {
      const householdId = getHouseholdId();
      if (!householdId) {
        throw new Error('No household available');
      }

      await apiService.delete(`/api/households/${householdId}/recipes/${recipeId}`);
      
      // Remove from recipes list
      const { recipes, favoriteRecipes, currentRecipe, total } = get();
      set({
        recipes: recipes.filter(r => r.id !== recipeId),
        favoriteRecipes: favoriteRecipes.filter(r => r.id !== recipeId),
        currentRecipe: currentRecipe?.id === recipeId ? null : currentRecipe,
        total: total - 1,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete recipe',
        loading: false,
      });
      throw error;
    }
  },

  toggleFavorite: async (recipeId: string) => {
    try {
      const householdId = getHouseholdId();
      if (!householdId) {
        throw new Error('No household available');
      }

      const response = await apiService.post(`/api/households/${householdId}/recipes/${recipeId}/favorite`);
      const responseData = await response.json();
      const updatedRecipe = responseData.data || responseData;
      
      // Update in recipes list
      const { recipes, favoriteRecipes, currentRecipe } = get();
      const updatedRecipes = recipes.map(recipe =>
        recipe.id === recipeId
          ? { ...recipe, isFavorite: updatedRecipe.isFavorite }
          : recipe
      );
      
      // Update favorites list
      let updatedFavorites = favoriteRecipes;
      if (updatedRecipe.isFavorite) {
        // Adding to favorites - find the updated recipe and add it
        const recipeListItem = updatedRecipes.find(r => r.id === recipeId);
        if (recipeListItem && !favoriteRecipes.find(r => r.id === recipeId)) {
          updatedFavorites = [recipeListItem, ...favoriteRecipes];
        }
      } else {
        // Removing from favorites
        updatedFavorites = favoriteRecipes.filter(r => r.id !== recipeId);
      }
      
      set({
        recipes: updatedRecipes,
        favoriteRecipes: updatedFavorites,
        currentRecipe: currentRecipe?.id === recipeId ? updatedRecipe : currentRecipe,
      });
      
      return updatedRecipe;
    } catch (error) {
      console.error('Toggle favorite error:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to toggle favorite',
      });
      throw error;
    }
  },

  fetchFavoriteRecipes: async () => {
    set({ loading: true, error: null });
    
    try {
      const householdId = getHouseholdId();
      if (!householdId) {
        throw new Error('No household available');
      }

      const response = await apiService.get(`/api/households/${householdId}/recipes/favorites`);
      const responseData = await response.json();
      const favorites = responseData.data || responseData || [];
      set({
        favoriteRecipes: favorites,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch favorite recipes',
        loading: false,
      });
    }
  },

  fetchTags: async () => {
    const householdId = getHouseholdId();
    if (!householdId) {
      throw new Error('No household available');
    }

    try {
      const response = await apiService.get(`/api/households/${householdId}/recipes/tags`);
      const responseData = await response.json();
      const tags = responseData.data || responseData || [];
      set({ tags });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tags',
      });
    }
  },

  fetchStats: async () => {
    const householdId = getHouseholdId();
    if (!householdId) {
      throw new Error('No household available');
    }

    try {
      const response = await apiService.get(`/api/households/${householdId}/recipes/stats`);
      const responseData = await response.json();
      const stats = responseData.data || responseData;
      set({ stats });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch recipe stats',
      });
    }
  },

  fetchIngredientStats: async () => {
    const householdId = getHouseholdId();
    if (!householdId) {
      throw new Error('No household available');
    }

    try {
      const response = await apiService.get(`/api/households/${householdId}/recipes/ingredients/stats`);
      const responseData = await response.json();
      const ingredientStats = responseData.data || responseData || [];
      set({ ingredientStats });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch ingredient stats',
      });
    }
  },

  getRecipesByUser: async (userId: string) => {
    const householdId = getHouseholdId();
    if (!householdId) {
      throw new Error('No household available');
    }

    try {
      const response = await apiService.get(`/api/households/${householdId}/users/${userId}/recipes`);
      const responseData = await response.json();
      return responseData.data || responseData || [];
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch user recipes',
      });
      throw error;
    }
  },

  setSearchParams: (params: RecipeSearchParams) => {
    set({ searchParams: params });
  },

  clearCurrentRecipe: () => set({ currentRecipe: null }),
  clearError: () => set({ error: null }),
  reset: () => set(initialState),
})); 