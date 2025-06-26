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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper function to make authenticated API calls
const makeApiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('google_token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
};

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

      console.log('Fetching recipes for household:', householdId);
      const response = await makeApiCall(`/api/recipes/${householdId}/recipes?${queryParams}`);
      console.log('Recipes API response:', response);
      
      // Handle backend response structure: { success: true, data: { recipes, total, hasMore } }
      const result = response.data || response;
      const recipes = result.recipes || result || [];
      const total = result.total || recipes.length;
      const hasMore = result.hasMore || false;
      
      console.log('Processed recipes:', { recipes, total, hasMore });
      
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
      const response = await makeApiCall(`/api/recipes/${householdId}/recipes/${recipeId}`);
      const recipe = response.data || response;
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
      const response = await makeApiCall(`/api/recipes/${householdId}/recipes`, {
        method: 'POST',
        body: JSON.stringify(recipeData),
      });
      const newRecipe = response.data || response;
      
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
      const response = await makeApiCall(`/api/recipes/${householdId}/recipes/${recipeId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const updatedRecipe = response.data || response;
      
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
      await makeApiCall(`/api/recipes/${householdId}/recipes/${recipeId}`, {
        method: 'DELETE',
      });
      
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
      console.log('Toggling favorite for recipe:', recipeId);
      const response = await makeApiCall(`/api/recipes/${householdId}/recipes/${recipeId}/favorite`, {
        method: 'POST',
      });
      const updatedRecipe = response.data || response;
      console.log('Toggle favorite response:', updatedRecipe);
      
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
      
      console.log('Updated recipes state:', {
        originalRecipesCount: recipes.length,
        updatedRecipesCount: updatedRecipes.length,
        originalFavoritesCount: favoriteRecipes.length,
        updatedFavoritesCount: updatedFavorites.length,
        recipeIsFavorite: updatedRecipe.isFavorite
      });
      
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
      const response = await makeApiCall(`/api/recipes/${householdId}/recipes/favorites`);
      const favorites = response.data || response || [];
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
      const response = await makeApiCall(`/api/recipes/${householdId}/recipes/tags`);
      const tags = response.data || response || [];
      set({ tags });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tags',
      });
    }
  },

  fetchStats: async (householdId: string) => {
    try {
      const response = await makeApiCall(`/api/recipes/${householdId}/recipes/stats`);
      const stats = response.data || response;
      set({ stats });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch recipe stats',
      });
    }
  },

  fetchIngredientStats: async (householdId: string) => {
    try {
      const response = await makeApiCall(`/api/recipes/${householdId}/recipes/ingredients/stats`);
      const ingredientStats = response.data || response || [];
      set({ ingredientStats });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch ingredient stats',
      });
    }
  },

  getRecipesByUser: async (householdId: string, userId: string) => {
    try {
      const response = await makeApiCall(`/api/recipes/${householdId}/users/${userId}/recipes`);
      return response.data || response || [];
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