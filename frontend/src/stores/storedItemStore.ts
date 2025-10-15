import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { toast } from 'sonner';
import { StoredItem, CreateStoredItemRequest, UpdateStoredItemRequest, GetStoredItemsRequest } from '@/services/storedItemService';
import { useHouseholdStore } from './householdStore';

interface StoredItemStore {
  // State - organized by household ID for efficient caching
  storedItemsByHousehold: Record<string, StoredItem[]>;
  loading: boolean;
  error: string | null;

  // Actions
  fetchStoredItems: (params?: GetStoredItemsRequest) => Promise<void>;
  fetchStoredItemsByStorageArea: (storageAreaId: string) => Promise<void>;
  fetchExpiringItems: (days?: number) => Promise<void>;
  fetchExpiredItems: () => Promise<void>;
  createStoredItem: (data: CreateStoredItemRequest) => Promise<StoredItem>;
  updateStoredItem: (id: string, data: UpdateStoredItemRequest) => Promise<void>;
  deleteStoredItem: (id: string) => Promise<void>;
  
  // Internal actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStoredItemsForHousehold: (storedItems: StoredItem[]) => void;
  clearStoredItemsForHousehold: () => void;
  addStoredItemToHousehold: (storedItem: StoredItem) => void;
  updateStoredItemInHousehold: (storedItem: StoredItem) => void;
  removeStoredItemFromHousehold: (storedItemId: string) => void;
  
  // Computed getters
  getStoredItemsForHousehold: () => StoredItem[];
  getStoredItemById: (storedItemId: string) => StoredItem | null;
  getStoredItemsByStorageArea: (storageAreaId: string) => StoredItem[];
  getStoredItemsByItem: (itemId: string) => StoredItem[];
  getExpiringStoredItems: () => StoredItem[];
  getExpiredStoredItems: () => StoredItem[];
}

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

// Create API instance outside the store to avoid circular dependencies
let apiInstance: ReturnType<typeof useApiWithAuth> | null = null;

const getApi = () => {
  if (!apiInstance) {
    console.warn('API instance not initialized. Store operations will be skipped.');
    return null;
  }
  return apiInstance;
};

export const initializeStoredItemStore = (api: ReturnType<typeof useApiWithAuth>) => {
  apiInstance = api;
};

export const useStoredItemStore = create<StoredItemStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      storedItemsByHousehold: {},
      loading: false,
      error: null,

      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      
      setStoredItemsForHousehold: (storedItems: StoredItem[]) => {
        const householdId = getHouseholdId();
        set(state => ({
          storedItemsByHousehold: {
            ...state.storedItemsByHousehold,
            [householdId]: storedItems
          }
        }));
      },

      clearStoredItemsForHousehold: () => {
        const householdId = getHouseholdId();
        set(state => {
          const newStoredItems = { ...state.storedItemsByHousehold };
          delete newStoredItems[householdId];
          return { storedItemsByHousehold: newStoredItems };
        });
      },

      addStoredItemToHousehold: (storedItem: StoredItem) => {
        const householdId = getHouseholdId();
        set(state => ({
          storedItemsByHousehold: {
            ...state.storedItemsByHousehold,
            [householdId]: [...(state.storedItemsByHousehold[householdId] || []), storedItem]
          }
        }));
      },

      updateStoredItemInHousehold: (updatedStoredItem: StoredItem) => {
        const householdId = getHouseholdId();
        set(state => ({
          storedItemsByHousehold: {
            ...state.storedItemsByHousehold,
            [householdId]: (state.storedItemsByHousehold[householdId] || []).map(item =>
              item.id === updatedStoredItem.id ? updatedStoredItem : item
            )
          }
        }));
      },

      removeStoredItemFromHousehold: (storedItemId: string) => {
        const householdId = getHouseholdId();
        set(state => ({
          storedItemsByHousehold: {
            ...state.storedItemsByHousehold,
            [householdId]: (state.storedItemsByHousehold[householdId] || []).filter(item => item.id !== storedItemId)
          }
        }));
      },

      fetchStoredItems: async (params?: GetStoredItemsRequest) => {
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
          const searchParams = new URLSearchParams();
          
          if (params?.storageAreaId) searchParams.append('storageAreaId', params.storageAreaId);
          if (params?.itemId) searchParams.append('itemId', params.itemId);
          if (params?.search) searchParams.append('search', params.search);
          if (params?.isExpired !== undefined) searchParams.append('isExpired', params.isExpired.toString());
          if (params?.isExpiringSoon !== undefined) searchParams.append('isExpiringSoon', params.isExpiringSoon.toString());
          if (params?.limit) searchParams.append('limit', params.limit.toString());
          if (params?.offset) searchParams.append('offset', params.offset.toString());

          const response = await api.get(`/api/households/${householdId}/stored-items?${searchParams.toString()}`);
          
          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              const store = get();
              store.setStoredItemsForHousehold(responseData.data?.items || []);
            } else {
              throw new Error(responseData.message || 'Failed to fetch stored items');
            }
          } else {
            const errorText = await response.text();
            console.error('fetchStoredItems: Error response:', response.status, errorText);
            throw new Error(`Failed to fetch stored items: ${response.status}`);
          }
        } catch (error) {
          if (error instanceof TypeError && error.message.includes('NetworkError')) {
            const message = 'Network error: Unable to connect to the server. Please check if the backend is running.';
            set({ error: message });
          } else {
            const message = error instanceof Error ? error.message : 'Failed to fetch stored items';
            set({ error: message });
          }
        } finally {
          set({ loading: false });
        }
      },

      fetchStoredItemsByStorageArea: async (storageAreaId: string) => {
        const householdId = getHouseholdId();
        if (!householdId || !storageAreaId) {
          return;
        }

        const api = getApi();
        if (!api) {
          return;
        }

        set({ loading: true, error: null });
        
        try {
          const response = await api.get(`/api/households/${householdId}/storage-areas/${storageAreaId}/stored-items`);
          
          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              const store = get();
              store.setStoredItemsForHousehold(responseData.data || []);
            } else {
              throw new Error(responseData.message || 'Failed to fetch stored items by storage area');
            }
          } else {
            const errorText = await response.text();
            console.error('fetchStoredItemsByStorageArea: Error response:', response.status, errorText);
            throw new Error(`Failed to fetch stored items by storage area: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch stored items by storage area';
          set({ error: message });
        } finally {
          set({ loading: false });
        }
      },

      fetchExpiringItems: async (days?: number) => {
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
          const searchParams = new URLSearchParams();
          if (days) searchParams.append('days', days.toString());

          const response = await api.get(`/api/households/${householdId}/stored-items/expiring?${searchParams.toString()}`);
          
          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              const store = get();
              store.setStoredItemsForHousehold(responseData.data || []);
            } else {
              throw new Error(responseData.message || 'Failed to fetch expiring items');
            }
          } else {
            const errorText = await response.text();
            console.error('fetchExpiringItems: Error response:', response.status, errorText);
            throw new Error(`Failed to fetch expiring items: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch expiring items';
          set({ error: message });
        } finally {
          set({ loading: false });
        }
      },

      fetchExpiredItems: async () => {
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
          const response = await api.get(`/api/households/${householdId}/stored-items/expired`);
          
          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              const store = get();
              store.setStoredItemsForHousehold(responseData.data || []);
            } else {
              throw new Error(responseData.message || 'Failed to fetch expired items');
            }
          } else {
            const errorText = await response.text();
            console.error('fetchExpiredItems: Error response:', response.status, errorText);
            throw new Error(`Failed to fetch expired items: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch expired items';
          set({ error: message });
        } finally {
          set({ loading: false });
        }
      },

      createStoredItem: async (data: CreateStoredItemRequest) => {
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
          const response = await api.post(`/api/households/${householdId}/stored-items`, data);
          
          if (response.ok) {
            const responseData = await response.json();
            
            if (responseData.success) {
              toast.success("Item Added!", {
                description: `Item has been added to storage successfully.`,
              });
              
              const store = get();
              store.addStoredItemToHousehold(responseData.data);
              return responseData.data;
            } else {
              throw new Error(responseData.message || 'Failed to create stored item');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to create stored item: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create stored item';
          set({ error: message });
          toast.error("Failed to Add Item", {
            description: message,
          });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateStoredItem: async (id: string, data: UpdateStoredItemRequest) => {
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
          const response = await api.put(`/api/households/${householdId}/stored-items/${id}`, data);
          
          if (response.ok) {
            const responseData = await response.json();
            
            if (responseData.success) {
              toast.success("Item Updated!", {
                description: `Item has been updated successfully.`,
              });
              
              const store = get();
              store.updateStoredItemInHousehold(responseData.data);
            } else {
              throw new Error(responseData.message || 'Failed to update stored item');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to update stored item: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update stored item';
          set({ error: message });
          toast.error("Update Failed", {
            description: message,
          });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteStoredItem: async (id: string) => {
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
          const response = await api.delete(`/api/households/${householdId}/stored-items/${id}`);
          
          if (response.ok) {
            const responseData = await response.json();
            
            if (responseData.success) {
              toast.success("Item Removed!", {
                description: `Item has been removed from storage.`,
              });
              
              const store = get();
              store.removeStoredItemFromHousehold(id);
            } else {
              throw new Error(responseData.message || 'Failed to delete stored item');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to delete stored item: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete stored item';
          set({ error: message });
          toast.error("Delete Failed", {
            description: message,
          });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Computed getters
      getStoredItemsForHousehold: () => {
        const householdId = getHouseholdId();
        const state = get();
        return state.storedItemsByHousehold[householdId] || [];
      },

      getStoredItemById: (storedItemId: string) => {
        const householdId = getHouseholdId();
        const state = get();
        const storedItems = state.storedItemsByHousehold[householdId] || [];
        return storedItems.find(item => item.id === storedItemId) || null;
      },

      getStoredItemsByStorageArea: (storageAreaId: string) => {
        const householdId = getHouseholdId();
        const state = get();
        const storedItems = state.storedItemsByHousehold[householdId] || [];
        return storedItems.filter(item => item.storageAreaId === storageAreaId);
      },

      getStoredItemsByItem: (itemId: string) => {
        const householdId = getHouseholdId();
        const state = get();
        const storedItems = state.storedItemsByHousehold[householdId] || [];
        return storedItems.filter(item => item.itemId === itemId);
      },

      getExpiringStoredItems: () => {
        const householdId = getHouseholdId();
        const state = get();
        const storedItems = state.storedItemsByHousehold[householdId] || [];
        return storedItems.filter(item => item.isExpiringSoon);
      },

      getExpiredStoredItems: () => {
        const householdId = getHouseholdId();
        const state = get();
        const storedItems = state.storedItemsByHousehold[householdId] || [];
        return storedItems.filter(item => item.isExpired);
      },
    }),
    {
      name: 'stored-item-store',
    }
  )
);

// Computed hooks
export const useCurrentHouseholdStoredItems = (currentHouseholdId: string | null) => {
  const storedItems = useStoredItemStore(state => 
    currentHouseholdId ? state.getStoredItemsForHousehold() : []
  );
  const loading = useStoredItemStore(state => state.loading);
  const error = useStoredItemStore(state => state.error);
  
  return { storedItems, loading, error };
}; 