
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

// Generate some dummy meal plans for the current week
const generateDummyMealPlans = (): MealPlan[] => {
  const today = new Date();
  const dummyRecipes = [
    {
      id: '1',
      title: 'Avocado Toast',
      description: 'Healthy breakfast with smashed avocado on sourdough',
      prepTime: 10,
      cookTime: 5,
      servings: 2,
      difficulty: 'Easy',
      tags: ['breakfast', 'healthy', 'vegetarian']
    },
    {
      id: '2',
      title: 'Chicken Caesar Salad',
      description: 'Classic Caesar salad with grilled chicken breast',
      prepTime: 20,
      cookTime: 15,
      servings: 4,
      difficulty: 'Medium',
      tags: ['lunch', 'salad', 'protein']
    },
    {
      id: '3',
      title: 'Spaghetti Carbonara',
      description: 'Creamy Italian pasta with pancetta and parmesan',
      prepTime: 15,
      cookTime: 20,
      servings: 4,
      difficulty: 'Medium',
      tags: ['dinner', 'pasta', 'italian']
    },
    {
      id: '4',
      title: 'Greek Yogurt Bowl',
      description: 'Protein-rich yogurt with berries and granola',
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      difficulty: 'Easy',
      tags: ['breakfast', 'healthy', 'quick']
    },
    {
      id: '5',
      title: 'Beef Stir Fry',
      description: 'Quick and healthy stir fry with mixed vegetables',
      prepTime: 15,
      cookTime: 10,
      servings: 3,
      difficulty: 'Easy',
      tags: ['dinner', 'asian', 'healthy']
    },
    {
      id: '6',
      title: 'Quinoa Buddha Bowl',
      description: 'Nutritious bowl with quinoa, roasted vegetables, and tahini dressing',
      prepTime: 25,
      cookTime: 30,
      servings: 2,
      difficulty: 'Medium',
      tags: ['lunch', 'healthy', 'vegan']
    }
  ];

  const mealPlans: MealPlan[] = [
    {
      id: '1',
      plannedFor: new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString(),
      mealType: 'breakfast',
      servings: 2,
      recipeId: '1',
      recipe: dummyRecipes[0]
    },
    {
      id: '2',
      plannedFor: new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString(),
      mealType: 'lunch',
      servings: 4,
      recipeId: '2',
      recipe: dummyRecipes[1]
    },
    {
      id: '3',
      plannedFor: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString(),
      mealType: 'dinner',
      servings: 4,
      recipeId: '3',
      recipe: dummyRecipes[2]
    },
    {
      id: '4',
      plannedFor: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString(),
      mealType: 'breakfast',
      servings: 1,
      recipeId: '4',
      recipe: dummyRecipes[3]
    },
    {
      id: '5',
      plannedFor: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2).toISOString(),
      mealType: 'dinner',
      servings: 3,
      recipeId: '5',
      recipe: dummyRecipes[4]
    },
    {
      id: '6',
      plannedFor: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3).toISOString(),
      mealType: 'lunch',
      servings: 2,
      recipeId: '6',
      recipe: dummyRecipes[5]
    }
  ];

  return mealPlans;
};

export const useMealPlanStore = create<MealPlanStore>((set, get) => ({
  mealPlans: [],
  loading: false,
  savingMealPlan: false,
  deletingMealPlan: false,

  fetchMealPlans: async () => {
    set({ loading: true });
    try {
      // Return dummy data
      const dummyMealPlans = generateDummyMealPlans();
      set({ mealPlans: dummyMealPlans });
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
          title: 'New Recipe',
          description: 'A delicious new recipe',
          prepTime: 15,
          cookTime: 25,
          servings: 4,
          difficulty: 'Easy',
          tags: ['new']
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
