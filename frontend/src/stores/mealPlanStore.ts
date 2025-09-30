import { create } from 'zustand';
import { MealPlanDto, CreateMealPlanDto, createMealPlanApiService } from '@/services/mealPlanService';
import { useHouseholdStore } from './householdStore';

export interface MealPlan extends MealPlanDto {
  // Keep the same interface for backwards compatibility with components
  plannedFor: string; // Will map to 'date' from backend
}

interface MealPlanStore {
  mealPlans: MealPlan[];
  loading: boolean;
  savingMealPlan: boolean;
  deletingMealPlan: boolean;
  fetchMealPlans: () => Promise<void>;
  fetchMealPlansByDateRange: (startDate: string, endDate: string) => Promise<void>;
  createMealPlan: (data: CreateMealPlanDto) => Promise<void>;
  updateMealPlan: (id: string, data: Partial<CreateMealPlanDto>) => Promise<void>;
  deleteMealPlan: (id: string) => Promise<void>;
  generateShoppingList: (startDate: string, endDate: string) => Promise<any[]>;
}

// Helper function to get household ID
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

// Helper function to transform backend DTO to frontend interface
const transformMealPlan = (dto: MealPlanDto): MealPlan => ({
  ...dto,
  plannedFor: dto.date, // Map 'date' to 'plannedFor' for compatibility
});

// Create the API service instance
const mealPlanApiService = createMealPlanApiService();

export const useMealPlanStore = create<MealPlanStore>((set, get) => ({
  mealPlans: [],
  loading: false,
  savingMealPlan: false,
  deletingMealPlan: false,

  fetchMealPlans: async () => {
    set({ loading: true });
    try {
      const householdId = getHouseholdId();
      if (!householdId) {
        set({ mealPlans: [], loading: false });
        return;
      }
      
      // Get meal plans for current week
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start from Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Sunday
      
      const startDate = startOfWeek.toISOString().split('T')[0];
      const endDate = endOfWeek.toISOString().split('T')[0];
      
      const mealPlanDtos = await mealPlanApiService.getMealPlansByDateRange(householdId, startDate, endDate);
      const mealPlans = mealPlanDtos.map(transformMealPlan);
      
      set({ mealPlans });
    } catch (error) {
      console.error('Error fetching meal plans:', error);
      // Fallback to empty array on error
      set({ mealPlans: [] });
    } finally {
      set({ loading: false });
    }
  },

  fetchMealPlansByDateRange: async (startDate: string, endDate: string) => {
    set({ loading: true });
    try {
      const householdId = getHouseholdId();
      if (!householdId) {
        throw new Error('No household selected. Please select a household first.');
      }

      const mealPlanDtos = await mealPlanApiService.getMealPlansByDateRange(householdId, startDate, endDate);
      const mealPlans = mealPlanDtos.map(transformMealPlan);
      
      set({ mealPlans });
    } catch (error) {
      console.error('Error fetching meal plans by date range:', error);
      set({ mealPlans: [] });
    } finally {
      set({ loading: false });
    }
  },

  createMealPlan: async (data: CreateMealPlanDto) => {
    set({ savingMealPlan: true });
    try {
      const houseId = getHouseholdId();
      if (!houseId) {
        throw new Error('No household selected. Please select a household first.');
      }
      
      const newMealPlanDto = await mealPlanApiService.createMealPlan(houseId, data);
      const newMealPlan = transformMealPlan(newMealPlanDto);
      
      set({ mealPlans: [...get().mealPlans, newMealPlan] });
    } catch (error) {
      console.error('Error creating meal plan:', error);
      throw error;
    } finally {
      set({ savingMealPlan: false });
    }
  },

  updateMealPlan: async (id: string, data: Partial<CreateMealPlanDto>, householdId?: string) => {
    set({ savingMealPlan: true });
    try {
      const houseId = getHouseholdId(householdId);
      if (!houseId) {
        throw new Error('No household selected. Please select a household first.');
      }
      
      const updatedMealPlanDto = await mealPlanApiService.updateMealPlan(houseId, id, data);
      const updatedMealPlan = transformMealPlan(updatedMealPlanDto);
      
      set({ 
        mealPlans: get().mealPlans.map(mp => 
          mp.id === id ? updatedMealPlan : mp
        )
      });
    } catch (error) {
      console.error('Error updating meal plan:', error);
      throw error;
    } finally {
      set({ savingMealPlan: false });
    }
  },

  deleteMealPlan: async (id: string) => {
    set({ deletingMealPlan: true });
    try {
      const houseId = getHouseholdId();
      if (!houseId) {
        throw new Error('No household selected. Please select a household first.');
      }
      
      await mealPlanApiService.deleteMealPlan(houseId, id);
      
      set({ 
        mealPlans: get().mealPlans.filter(mp => mp.id !== id)
      });
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      throw error;
    } finally {
      set({ deletingMealPlan: false });
    }
  },

  generateShoppingList: async (startDate: string, endDate: string) => {
    try {
      const houseId = getHouseholdId();
      if (!houseId) {
        throw new Error('No household selected. Please select a household first.');
      }
      
      const shoppingList = await mealPlanApiService.generateShoppingList(houseId, startDate, endDate);
      return shoppingList;
    } catch (error) {
      console.error('Error generating shopping list:', error);
      throw error;
    }
  },
}));
