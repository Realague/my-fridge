import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { ItemMinimum, CreateItemMinimumRequest, UpdateItemMinimumRequest, LowStockItem } from '@/services/itemMinimumService';
import { useHouseholdStore } from './householdStore';

interface ItemMinimumStore {
  // State - organized by household ID for efficient caching
  itemMinimumsByHousehold: Record<string, ItemMinimum[]>;
  lowStockItemsByHousehold: Record<string, LowStockItem[]>;
  loading: boolean;
  error: string | null;

  // Actions
  fetchItemMinimums: () => Promise<void>;
  fetchLowStockItems: () => Promise<void>;
  createItemMinimum: (data: CreateItemMinimumRequest) => Promise<ItemMinimum>;
  updateItemMinimum: (id: string, data: UpdateItemMinimumRequest) => Promise<void>;
  deleteItemMinimum: (id: string) => Promise<void>;
  
  // Internal actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setItemMinimumsForHousehold: (itemMinimums: ItemMinimum[]) => void;
  setLowStockItemsForHousehold: (lowStockItems: LowStockItem[]) => void;
  addItemMinimumToHousehold: (itemMinimum: ItemMinimum) => void;
  updateItemMinimumInHousehold: (itemMinimum: ItemMinimum) => void;
  removeItemMinimumFromHousehold: (itemMinimumId: string) => void;
  
  // Computed getters
  getItemMinimumsForHousehold: () => ItemMinimum[];
  getLowStockItemsForHousehold: () => LowStockItem[];
  getItemMinimumById: (itemMinimumId: string) => ItemMinimum | null;
  hasMinimumForItem: (itemId: string) => boolean;
  getMinimumForItem: (itemId: string) => ItemMinimum | null;
}

const getHouseholdId = (): string | null => {
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

// Create API instance outside the store to avoid circular dependencies
let apiInstance: ReturnType<typeof useApiWithAuth> | null = null;

const getApi = () => {
  if (!apiInstance) {
    console.warn('API instance not initialized. Store operations will be skipped.');
    return null;
  }
  return apiInstance;
};

export const initializeItemMinimumStore = (api: ReturnType<typeof useApiWithAuth>) => {
  apiInstance = api;
};

export const useItemMinimumStore = create<ItemMinimumStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      itemMinimumsByHousehold: {},
      lowStockItemsByHousehold: {},
      loading: false,
      error: null,

      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      
      setItemMinimumsForHousehold: (itemMinimums: ItemMinimum[]) => {
        const householdId = getHouseholdId();
        if (!householdId) return;
        set(state => ({
          itemMinimumsByHousehold: {
            ...state.itemMinimumsByHousehold,
            [householdId]: itemMinimums
          }
        }));
      },

      setLowStockItemsForHousehold: (lowStockItems: LowStockItem[]) => {
        const householdId = getHouseholdId();
        if (!householdId) return;
        set(state => ({
          lowStockItemsByHousehold: {
            ...state.lowStockItemsByHousehold,
            [householdId]: lowStockItems
          }
        }));
      },

      addItemMinimumToHousehold: (itemMinimum: ItemMinimum) => {
        const householdId = getHouseholdId();
        if (!householdId) return;
        set(state => ({
          itemMinimumsByHousehold: {
            ...state.itemMinimumsByHousehold,
            [householdId]: [...(state.itemMinimumsByHousehold[householdId] || []), itemMinimum]
          }
        }));
      },

      updateItemMinimumInHousehold: (updatedItemMinimum: ItemMinimum) => {
        const householdId = getHouseholdId();
        if (!householdId) return;
        set(state => ({
          itemMinimumsByHousehold: {
            ...state.itemMinimumsByHousehold,
            [householdId]: (state.itemMinimumsByHousehold[householdId] || []).map(item =>
              item.id === updatedItemMinimum.id ? updatedItemMinimum : item
            )
          }
        }));
      },

      removeItemMinimumFromHousehold: (itemMinimumId: string) => {
        const householdId = getHouseholdId();
        if (!householdId) return;
        set(state => ({
          itemMinimumsByHousehold: {
            ...state.itemMinimumsByHousehold,
            [householdId]: (state.itemMinimumsByHousehold[householdId] || []).filter(item => item.id !== itemMinimumId)
          }
        }));
      },

      fetchItemMinimums: async () => {
        const householdId = getHouseholdId();
        if (!householdId) {
          return;
        }

        const api = getApi();
        if (!api) {
          return;
        }

        set({ loading: true, error: null });
        
        try {
          const response = await api.get(`/api/households/${householdId}/item-minimums`);
          
          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              const store = get();
              store.setItemMinimumsForHousehold(responseData.data?.itemMinimums || []);
            } else {
              throw new Error(responseData.message || 'Failed to fetch item minimums');
            }
          } else {
            const errorText = await response.text();
            console.error('fetchItemMinimums: Error response:', response.status, errorText);
            throw new Error(`Failed to fetch item minimums: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch item minimums';
          set({ error: message });
        } finally {
          set({ loading: false });
        }
      },

      fetchLowStockItems: async () => {
        const householdId = getHouseholdId();
        if (!householdId) {
          return;
        }

        const api = getApi();
        if (!api) {
          return;
        }

        set({ loading: true, error: null });
        
        try {
          const response = await api.get(`/api/households/${householdId}/item-minimums/low-stock`);
          
          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              const store = get();
              store.setLowStockItemsForHousehold(responseData.data || []);
            } else {
              throw new Error(responseData.message || 'Failed to fetch low stock items');
            }
          } else {
            const errorText = await response.text();
            console.error('fetchLowStockItems: Error response:', response.status, errorText);
            throw new Error(`Failed to fetch low stock items: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch low stock items';
          set({ error: message });
        } finally {
          set({ loading: false });
        }
      },

      createItemMinimum: async (data: CreateItemMinimumRequest) => {
        const householdId = getHouseholdId();
        if (!householdId) {
          throw new Error('No household ID provided');
        }

        const api = getApi();
        if (!api) {
          throw new Error('API not initialized');
        }

        set({ loading: true, error: null });
        
        try {
          const response = await api.post(`/api/households/${householdId}/item-minimums`, data);
          
          if (response.ok) {
            const responseData = await response.json();
            
            if (responseData.success) {
              const store = get();
              store.addItemMinimumToHousehold(responseData.data);
              return responseData.data;
            } else {
              throw new Error(responseData.message || 'Failed to create item minimum');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to create item minimum: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create item minimum';
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateItemMinimum: async (id: string, data: UpdateItemMinimumRequest) => {
        const householdId = getHouseholdId();
        if (!householdId) {
          throw new Error('No household ID provided');
        }

        const api = getApi();
        if (!api) {
          throw new Error('API not initialized');
        }

        set({ loading: true, error: null });
        
        try {
          const response = await api.put(`/api/households/${householdId}/item-minimums/${id}`, data);
          
          if (response.ok) {
            const responseData = await response.json();
            
            if (responseData.success) {
              const store = get();
              store.updateItemMinimumInHousehold(responseData.data);
            } else {
              throw new Error(responseData.message || 'Failed to update item minimum');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to update item minimum: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update item minimum';
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteItemMinimum: async (id: string) => {
        const householdId = getHouseholdId();
        if (!householdId) {
          throw new Error('No household ID provided');
        }

        const api = getApi();
        if (!api) {
          throw new Error('API not initialized');
        }

        set({ loading: true, error: null });
        
        try {
          const response = await api.delete(`/api/households/${householdId}/item-minimums/${id}`);
          
          if (response.ok) {
            const responseData = await response.json();
            
            if (responseData.success) {
              const store = get();
              store.removeItemMinimumFromHousehold(id);
            } else {
              throw new Error(responseData.message || 'Failed to delete item minimum');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to delete item minimum: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete item minimum';
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Computed getters
      getItemMinimumsForHousehold: () => {
        const householdId = getHouseholdId();
        if (!householdId) return [];
        const state = get();
        return state.itemMinimumsByHousehold[householdId] || [];
      },

      getLowStockItemsForHousehold: () => {
        const householdId = getHouseholdId();
        if (!householdId) return [];
        const state = get();
        return state.lowStockItemsByHousehold[householdId] || [];
      },

      getItemMinimumById: (itemMinimumId: string) => {
        const householdId = getHouseholdId();
        if (!householdId) return null;
        const state = get();
        const itemMinimums = state.itemMinimumsByHousehold[householdId] || [];
        return itemMinimums.find(item => item.id === itemMinimumId) || null;
      },

      hasMinimumForItem: (itemId: string) => {
        const householdId = getHouseholdId();
        if (!householdId) return false;
        const state = get();
        const itemMinimums = state.itemMinimumsByHousehold[householdId] || [];
        return itemMinimums.some(minimum => minimum.itemId === itemId);
      },

      getMinimumForItem: (itemId: string) => {
        const householdId = getHouseholdId();
        if (!householdId) return null;
        const state = get();
        const itemMinimums = state.itemMinimumsByHousehold[householdId] || [];
        return itemMinimums.find(minimum => minimum.itemId === itemId) || null;
      },
    }),
    {
      name: 'item-minimum-store',
    }
  )
);
