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
  fetchRecipes: (householdId: string, params?: RecipeSearchParams) => Promise<void>;
  fetchRecipeById: (householdId: string, recipeId: string) => Promise<void>;
  createRecipe: (householdId: string, recipeData: CreateRecipeDto) => Promise<RecipeDto>;
  updateRecipe: (householdId: string, recipeId: string, updates: UpdateRecipeDto) => Promise<RecipeDto>;
  deleteRecipe: (householdId: string, recipeId: string) => Promise<void>;
  toggleFavorite: (householdId: string, recipeId: string) => Promise<RecipeDto>;
  fetchFavoriteRecipes: (householdId: string) => Promise<void>;
  fetchTags: (householdId: string) => Promise<void>;
  fetchStats: (householdId: string) => Promise<void>;
  fetchIngredientStats: (householdId: string) => Promise<void>;
  getRecipesByUser: (householdId: string, userId: string) => Promise<RecipeListDto[]>;
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

  fetchRecipes: async (householdId: string, params: RecipeSearchParams = {}) => {
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

      const response = await apiService.get(`/api/recipes/${householdId}/recipes?${queryParams}`);
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

  fetchRecipeById: async (householdId: string, recipeId: string) => {
    set({ loading: true, error: null });
    
    try {
      const response = await apiService.get(`/api/recipes/${householdId}/recipes/${recipeId}`);
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

  createRecipe: async (householdId: string, recipeData: CreateRecipeDto) => {
    set({ loading: true, error: null });
    
    try {
      const response = await apiService.post(`/api/recipes/${householdId}/recipes`, recipeData);
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
        image: newRecipe.image,
        isFavorite: newRecipe.isFavorite,
        createdBy: newRecipe.createdBy,
        createdAt: newRecipe.createdAt,
        ingredientCount: newRecipe.ingredients.length,
        creator: newRecipe.creator,
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

  updateRecipe: async (householdId: string, recipeId: string, updates: UpdateRecipeDto) => {
    set({ loading: true, error: null });
    
    try {
      const response = await apiService.put(`/api/recipes/${householdId}/recipes/${recipeId}`, updates);
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

  deleteRecipe: async (householdId: string, recipeId: string) => {
    set({ loading: true, error: null });
    
    try {
      await apiService.delete(`/api/recipes/${householdId}/recipes/${recipeId}`);
      
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

  toggleFavorite: async (householdId: string, recipeId: string) => {
    try {
      const response = await apiService.post(`/api/recipes/${householdId}/recipes/${recipeId}/favorite`);
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

  fetchFavoriteRecipes: async (householdId: string) => {
    set({ loading: true, error: null });
    
    try {
      const response = await apiService.get(`/api/recipes/${householdId}/recipes/favorites`);
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

  fetchTags: async (householdId: string) => {
    try {
      const response = await apiService.get(`/api/recipes/${householdId}/recipes/tags`);
      const responseData = await response.json();
      const tags = responseData.data || responseData || [];
      set({ tags });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tags',
      });
    }
  },

  fetchStats: async (householdId: string) => {
    try {
      const response = await apiService.get(`/api/recipes/${householdId}/recipes/stats`);
      const responseData = await response.json();
      const stats = responseData.data || responseData;
      set({ stats });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch recipe stats',
      });
    }
  },

  fetchIngredientStats: async (householdId: string) => {
    try {
      const response = await apiService.get(`/api/recipes/${householdId}/recipes/ingredients/stats`);
      const responseData = await response.json();
      const ingredientStats = responseData.data || responseData || [];
      set({ ingredientStats });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch ingredient stats',
      });
    }
  },

  getRecipesByUser: async (householdId: string, userId: string) => {
    try {
      const response = await apiService.get(`/api/recipes/${householdId}/users/${userId}/recipes`);
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