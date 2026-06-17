import { create } from 'zustand';
import {
  mealService,
  MealDto,
  MealsAvailabilityDto,
  RecipeAvailabilityDto,
  ShoppingPreviewDto,
  CommitShoppingItemInputDto,
  CommitShoppingMergeDto,
  MealRemovalImpactDto,
  MealRemovalActionDto,
} from '@/services/mealService';
import { useHouseholdStore } from './householdStore';

interface MealStore {
  meals: MealDto[];
  availability: MealsAvailabilityDto | null;
  recipesAvailability: Record<string, RecipeAvailabilityDto>;
  loading: boolean;
  saving: boolean;
  removing: boolean;
  loadingAvailability: boolean;
  loadingRecipesAvailability: boolean;
  fetchMeals: () => Promise<void>;
  addMeal: (recipeId: string, servings?: number) => Promise<MealDto | null>;
  updateServings: (id: string, servings: number) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  fetchAvailability: () => Promise<void>;
  fetchRecipesAvailability: () => Promise<void>;
  fetchShoppingPreview: () => Promise<ShoppingPreviewDto>;
  commitShopping: (items: CommitShoppingItemInputDto[]) => Promise<CommitShoppingMergeDto>;
  getRemovalImpact: (mealId: string) => Promise<MealRemovalImpactDto>;
  confirmRemoval: (mealId: string, actions: MealRemovalActionDto[]) => Promise<void>;
}

const getHouseholdId = (): string | null => {
  const selected = useHouseholdStore.getState().selectedHouseholdId;
  if (selected) return selected;
  const households = useHouseholdStore.getState().households;
  return households[0]?.id ?? null;
};

export const useMealStore = create<MealStore>((set, get) => ({
  meals: [],
  availability: null,
  recipesAvailability: {},
  loading: false,
  saving: false,
  removing: false,
  loadingAvailability: false,
  loadingRecipesAvailability: false,

  fetchMeals: async () => {
    const householdId = getHouseholdId();
    if (!householdId) {
      set({ meals: [] });
      return;
    }
    set({ loading: true });
    try {
      const meals = await mealService.listMeals(householdId);
      set({ meals });
    } catch (error) {
      console.error('Error fetching meals:', error);
      set({ meals: [] });
    } finally {
      set({ loading: false });
    }
  },

  addMeal: async (recipeId, servings) => {
    const householdId = getHouseholdId();
    if (!householdId) throw new Error('No household selected');
    set({ saving: true });
    try {
      const meal = await mealService.addMeal(householdId, { recipeId, servings });
      set({ meals: [...get().meals, meal] });
      return meal;
    } finally {
      set({ saving: false });
    }
  },

  updateServings: async (id, servings) => {
    const householdId = getHouseholdId();
    if (!householdId) throw new Error('No household selected');
    set({ saving: true });
    try {
      const updated = await mealService.updateMeal(householdId, id, { servings });
      set({
        meals: get().meals.map((m) => (m.id === id ? updated : m)),
      });
    } finally {
      set({ saving: false });
    }
  },

  removeMeal: async (id) => {
    const householdId = getHouseholdId();
    if (!householdId) throw new Error('No household selected');
    set({ removing: true });
    try {
      await mealService.removeMeal(householdId, id);
      set({ meals: get().meals.filter((m) => m.id !== id) });
    } finally {
      set({ removing: false });
    }
  },

  fetchAvailability: async () => {
    const householdId = getHouseholdId();
    if (!householdId) {
      set({ availability: null });
      return;
    }
    set({ loadingAvailability: true });
    try {
      const availability = await mealService.getAvailability(householdId);
      set({ availability });
    } catch (error) {
      console.error('Error fetching availability:', error);
      set({ availability: null });
    } finally {
      set({ loadingAvailability: false });
    }
  },

  fetchRecipesAvailability: async () => {
    const householdId = getHouseholdId();
    if (!householdId) {
      set({ recipesAvailability: {} });
      return;
    }
    set({ loadingRecipesAvailability: true });
    try {
      const list = await mealService.getRecipesAvailability(householdId);
      const map: Record<string, RecipeAvailabilityDto> = {};
      for (const entry of list) map[entry.recipeId] = entry;
      set({ recipesAvailability: map });
    } catch (error) {
      console.error('Error fetching recipes availability:', error);
      set({ recipesAvailability: {} });
    } finally {
      set({ loadingRecipesAvailability: false });
    }
  },

  fetchShoppingPreview: async () => {
    const householdId = getHouseholdId();
    if (!householdId) throw new Error('No household selected');
    return await mealService.getShoppingPreview(householdId);
  },

  commitShopping: async (items) => {
    const householdId = getHouseholdId();
    if (!householdId) throw new Error('No household selected');
    return await mealService.commitShopping(householdId, items);
  },

  getRemovalImpact: async (mealId) => {
    const householdId = getHouseholdId();
    if (!householdId) throw new Error('No household selected');
    return await mealService.getRemovalImpact(householdId, mealId);
  },

  confirmRemoval: async (mealId, actions) => {
    const householdId = getHouseholdId();
    if (!householdId) throw new Error('No household selected');
    set({ removing: true });
    try {
      await mealService.confirmRemoval(householdId, mealId, actions);
      set({ meals: get().meals.filter((m) => m.id !== mealId) });
    } finally {
      set({ removing: false });
    }
  },
}));
