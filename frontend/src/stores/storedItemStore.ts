import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { toast } from 'sonner';
import { StoredItem, CreateStoredItemRequest, UpdateStoredItemRequest, GetStoredItemsRequest, StoredItemsResponse } from '@/services/storedItemService';

interface StoredItemStore {
  // State - organized by household ID for efficient caching
  storedItemsByHousehold: Record<string, StoredItem[]>;
  loading: boolean;
  error: string | null;

  // Actions
  fetchStoredItems: (householdId: string, params?: GetStoredItemsRequest) => Promise<void>;
  fetchStoredItemsByStorageArea: (householdId: string, storageAreaId: string) => Promise<void>;
  fetchExpiringItems: (householdId: string, days?: number) => Promise<void>;
  fetchExpiredItems: (householdId: string) => Promise<void>;
  createStoredItem: (householdId: string, data: CreateStoredItemRequest) => Promise<StoredItem>;
  updateStoredItem: (householdId: string, id: string, data: UpdateStoredItemRequest) => Promise<void>;
  deleteStoredItem: (householdId: string, id: string) => Promise<void>;
  
  // Internal actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStoredItemsForHousehold: (householdId: string, storedItems: StoredItem[]) => void;
  clearStoredItemsForHousehold: (householdId: string) => void;
  addStoredItemToHousehold: (householdId: string, storedItem: StoredItem) => void;
  updateStoredItemInHousehold: (householdId: string, storedItem: StoredItem) => void;
  removeStoredItemFromHousehold: (householdId: string, storedItemId: string) => void;
  
  // Computed getters
  getStoredItemsForHousehold: (householdId: string) => StoredItem[];
  getStoredItemById: (householdId: string, storedItemId: string) => StoredItem | null;
  getStoredItemsByStorageArea: (householdId: string, storageAreaId: string) => StoredItem[];
  getExpiringStoredItems: (householdId: string) => StoredItem[];
  getExpiredStoredItems: (householdId: string) => StoredItem[];
}

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
      
      setStoredItemsForHousehold: (householdId: string, storedItems: StoredItem[]) => {
        set(state => ({
          storedItemsByHousehold: {
            ...state.storedItemsByHousehold,
            [householdId]: storedItems
          }
        }));
      },

      clearStoredItemsForHousehold: (householdId: string) => {
        set(state => {
          const newStoredItems = { ...state.storedItemsByHousehold };
          delete newStoredItems[householdId];
          return { storedItemsByHousehold: newStoredItems };
        });
      },

      addStoredItemToHousehold: (householdId: string, storedItem: StoredItem) => {
        set(state => ({
          storedItemsByHousehold: {
            ...state.storedItemsByHousehold,
            [householdId]: [...(state.storedItemsByHousehold[householdId] || []), storedItem]
          }
        }));
      },

      updateStoredItemInHousehold: (householdId: string, updatedStoredItem: StoredItem) => {
        set(state => ({
          storedItemsByHousehold: {
            ...state.storedItemsByHousehold,
            [householdId]: (state.storedItemsByHousehold[householdId] || []).map(item =>
              item.id === updatedStoredItem.id ? updatedStoredItem : item
            )
          }
        }));
      },

      removeStoredItemFromHousehold: (householdId: string, storedItemId: string) => {
        set(state => ({
          storedItemsByHousehold: {
            ...state.storedItemsByHousehold,
            [householdId]: (state.storedItemsByHousehold[householdId] || []).filter(item => item.id !== storedItemId)
          }
        }));
      },

      fetchStoredItems: async (householdId: string, params?: GetStoredItemsRequest) => {
        if (!householdId) {
          console.log('fetchStoredItems: No household ID provided');
          return;
        }

        const api = getApi();
        if (!api) {
          console.log('fetchStoredItems: API not initialized, skipping');
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
              store.setStoredItemsForHousehold(householdId, responseData.data?.items || []);
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

      fetchStoredItemsByStorageArea: async (householdId: string, storageAreaId: string) => {
        if (!householdId || !storageAreaId) {
          console.log('fetchStoredItemsByStorageArea: Missing required parameters');
          return;
        }

        const api = getApi();
        if (!api) {
          console.log('fetchStoredItemsByStorageArea: API not initialized, skipping');
          return;
        }

        set({ loading: true, error: null });
        
        try {
          const response = await api.get(`/api/households/${householdId}/storage-areas/${storageAreaId}/stored-items`);
          
          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              const store = get();
              store.setStoredItemsForHousehold(householdId, responseData.data || []);
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

      fetchExpiringItems: async (householdId: string, days?: number) => {
        if (!householdId) {
          console.log('fetchExpiringItems: No household ID provided');
          return;
        }

        const api = getApi();
        if (!api) {
          console.log('fetchExpiringItems: API not initialized, skipping');
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
              store.setStoredItemsForHousehold(householdId, responseData.data || []);
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

      fetchExpiredItems: async (householdId: string) => {
        if (!householdId) {
          console.log('fetchExpiredItems: No household ID provided');
          return;
        }

        const api = getApi();
        if (!api) {
          console.log('fetchExpiredItems: API not initialized, skipping');
          return;
        }

        set({ loading: true, error: null });
        
        try {
          const response = await api.get(`/api/households/${householdId}/stored-items/expired`);
          
          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              const store = get();
              store.setStoredItemsForHousehold(householdId, responseData.data || []);
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

      createStoredItem: async (householdId: string, data: CreateStoredItemRequest) => {
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
              store.addStoredItemToHousehold(householdId, responseData.data);
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

      updateStoredItem: async (householdId: string, id: string, data: UpdateStoredItemRequest) => {
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
              store.updateStoredItemInHousehold(householdId, responseData.data);
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

      deleteStoredItem: async (householdId: string, id: string) => {
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
              store.removeStoredItemFromHousehold(householdId, id);
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
      getStoredItemsForHousehold: (householdId: string) => {
        const state = get();
        return state.storedItemsByHousehold[householdId] || [];
      },

      getStoredItemById: (householdId: string, storedItemId: string) => {
        const state = get();
        const storedItems = state.storedItemsByHousehold[householdId] || [];
        return storedItems.find(item => item.id === storedItemId) || null;
      },

      getStoredItemsByStorageArea: (householdId: string, storageAreaId: string) => {
        const state = get();
        const storedItems = state.storedItemsByHousehold[householdId] || [];
        return storedItems.filter(item => item.storageAreaId === storageAreaId);
      },

      getExpiringStoredItems: (householdId: string) => {
        const state = get();
        const storedItems = state.storedItemsByHousehold[householdId] || [];
        return storedItems.filter(item => item.isExpiringSoon);
      },

      getExpiredStoredItems: (householdId: string) => {
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
    currentHouseholdId ? state.getStoredItemsForHousehold(currentHouseholdId) : []
  );
  const loading = useStoredItemStore(state => state.loading);
  const error = useStoredItemStore(state => state.error);
  
  return { storedItems, loading, error };
}; 