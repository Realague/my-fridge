
import { create } from 'zustand';

export interface MealPlan {
  id: string;
  plannedFor: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  recipeId: string;
  recipe: {
    id: string;
    title: string;
    description: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    difficulty: string;
    tags: string[];
  };
}

interface CreateMealPlanDto {
  plannedFor: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  recipeId: string;
}

interface MealPlanStore {
  mealPlans: MealPlan[];
  loading: boolean;
  savingMealPlan: boolean;
  deletingMealPlan: boolean;
  fetchMealPlans: () => Promise<void>;
  createMealPlan: (data: CreateMealPlanDto) => Promise<void>;
  deleteMealPlan: (id: string) => Promise<void>;
}

export const useMealPlanStore = create<MealPlanStore>((set, get) => ({
  mealPlans: [],
  loading: false,
  savingMealPlan: false,
  deletingMealPlan: false,

  fetchMealPlans: async () => {
    set({ loading: true });
    try {
      // Mock data for now - in a real app this would fetch from API
      const mockMealPlans: MealPlan[] = [];
      set({ mealPlans: mockMealPlans });
    } catch (error) {
      console.error('Error fetching meal plans:', error);
    } finally {
      set({ loading: false });
    }
  },

  createMealPlan: async (data: CreateMealPlanDto) => {
    set({ savingMealPlan: true });
    try {
      // Mock creation - in a real app this would call API
      const newMealPlan: MealPlan = {
        id: Date.now().toString(),
        ...data,
        recipe: {
          id: data.recipeId,
          title: 'Mock Recipe',
          description: 'Mock description',
          prepTime: 10,
          cookTime: 20,
          servings: 4,
          difficulty: 'Easy',
          tags: []
        }
      };
      
      set({ mealPlans: [...get().mealPlans, newMealPlan] });
    } catch (error) {
      console.error('Error creating meal plan:', error);
      throw error;
    } finally {
      set({ savingMealPlan: false });
    }
  },

  deleteMealPlan: async (id: string) => {
    set({ deletingMealPlan: true });
    try {
      set({ mealPlans: get().mealPlans.filter(plan => plan.id !== id) });
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      throw error;
    } finally {
      set({ deletingMealPlan: false });
    }
  },
}));
