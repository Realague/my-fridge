import React, { useMemo } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { toast } from 'sonner';
import { useStoredItemStore } from './storedItemStore';

export interface StorageArea {
  id: string;
  name: string;
  emoji: string;
  type: 'fridge' | 'freezer' | 'pantry' | 'kitchen_cupboard' | 'other';
  householdId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageAreaWithStats {
  id: string;
  name: string;
  emoji: string;
  type: 'fridge' | 'freezer' | 'pantry' | 'kitchen_cupboard' | 'other';
  itemCount: number;
  lowStockCount: number;
}

interface CreateStorageAreaData {
  name: string;
  emoji?: string;
  type?: 'fridge' | 'freezer' | 'pantry' | 'kitchen_cupboard' | 'other';
}

interface UpdateStorageAreaData {
  name?: string;
  emoji?: string;
  type?: 'fridge' | 'freezer' | 'pantry' | 'kitchen_cupboard' | 'other';
}

interface StorageAreaStore {
  // State - organized by household ID for efficient caching
  storageAreasByHousehold: Record<string, StorageArea[]>;
  loading: boolean;
  error: string | null;

  // Actions
  fetchStorageAreas: (householdId: string) => Promise<void>;
  createStorageArea: (householdId: string, data: CreateStorageAreaData) => Promise<StorageArea>;
  updateStorageArea: (householdId: string, storageAreaId: string, data: UpdateStorageAreaData) => Promise<void>;
  deleteStorageArea: (householdId: string, storageAreaId: string) => Promise<void>;
  
  // Internal actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStorageAreasForHousehold: (householdId: string, storageAreas: StorageArea[]) => void;
  clearStorageAreasForHousehold: (householdId: string) => void;
  
  // Computed getters
  getStorageAreasForHousehold: (householdId: string) => StorageArea[];
  getStorageAreaById: (householdId: string, storageAreaId: string) => StorageArea | null;
  getStorageAreasWithStats: (householdId: string) => StorageAreaWithStats[];
}

// Create API instance outside the store to avoid circular dependencies
let apiInstance: ReturnType<typeof useApiWithAuth> | null = null;

const getApi = () => {
  if (!apiInstance) {
    // Return null instead of throwing error to allow graceful handling
    console.warn('Storage area store: API instance not yet initialized');
    return null;
  }
  return apiInstance;
};

export const initializeStorageAreaStore = (api: ReturnType<typeof useApiWithAuth>) => {
  apiInstance = api;
};

export const useStorageAreaStore = create<StorageAreaStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      storageAreasByHousehold: {},
      loading: false,
      error: null,

      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      
      setStorageAreasForHousehold: (householdId: string, storageAreas: StorageArea[]) => {
        set(state => ({
          storageAreasByHousehold: {
            ...state.storageAreasByHousehold,
            [householdId]: storageAreas
          }
        }));
      },

      clearStorageAreasForHousehold: (householdId: string) => {
        set(state => {
          const newStorageAreas = { ...state.storageAreasByHousehold };
          delete newStorageAreas[householdId];
          return { storageAreasByHousehold: newStorageAreas };
        });
      },

      fetchStorageAreas: async (householdId: string) => {
        if (!householdId) {
          console.log('fetchStorageAreas: No household ID provided');
          return;
        }

        const api = getApi();
        if (!api) {
          console.log('fetchStorageAreas: API not initialized, skipping');
          return;
        }

        set({ loading: true, error: null });
        
        try {
          const response = await api.get(`/api/households/${householdId}/storage-areas`);
          
          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              const store = get();
              store.setStorageAreasForHousehold(householdId, responseData.data || []);
            } else {
              throw new Error(responseData.message || 'Failed to fetch storage areas');
            }
          } else {
            const errorText = await response.text();
            console.error('fetchStorageAreas: Error response:', response.status, errorText);
            throw new Error(`Failed to fetch storage areas: ${response.status}`);
          }
        } catch (error) {
          if (error instanceof TypeError && error.message.includes('NetworkError')) {
            const message = 'Network error: Unable to connect to the server. Please check if the backend is running.';
            set({ error: message });
          } else {
            const message = error instanceof Error ? error.message : 'Failed to fetch storage areas';
            set({ error: message });
          }
        } finally {
          set({ loading: false });
        }
      },

      createStorageArea: async (householdId: string, data: CreateStorageAreaData) => {
        if (!householdId) {
          throw new Error('No household ID provided');
        }

        const api = getApi();
        if (!api) {
          throw new Error('API not initialized');
        }

        set({ loading: true, error: null });
        
        try {
          const response = await api.post(`/api/households/${householdId}/storage-areas`, data);
          
          if (response.ok) {
            const responseData = await response.json();
            
            if (responseData.success) {
              toast.success("Storage Area Created!", {
                description: `${data.name} has been created successfully.`,
              });
              
              // Refresh the storage areas list for this household
              const store = get();
              await store.fetchStorageAreas(householdId);
              return responseData.data;
            } else {
              throw new Error(responseData.message || 'Failed to create storage area');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to create storage area: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create storage area';
          set({ error: message });
          toast.error("Creation Failed", {
            description: message,
          });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateStorageArea: async (householdId: string, storageAreaId: string, data: UpdateStorageAreaData) => {
        if (!householdId) {
          throw new Error('No household ID provided');
        }

        const api = getApi();
        if (!api) {
          throw new Error('API not initialized');
        }

        set({ loading: true, error: null });
        
        try {
          const response = await api.put(`/api/households/${householdId}/storage-areas/${storageAreaId}`, data);
          
          if (response.ok) {
            const responseData = await response.json();
            
            if (responseData.success) {
              toast.success("Storage Area Updated!", {
                description: `Storage area has been updated successfully.`,
              });
              
              // Refresh the storage areas list for this household
              const store = get();
              await store.fetchStorageAreas(householdId);
            } else {
              throw new Error(responseData.message || 'Failed to update storage area');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to update storage area: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update storage area';
          set({ error: message });
          toast.error("Update Failed", {
            description: message,
          });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteStorageArea: async (householdId: string, storageAreaId: string) => {
        if (!householdId) {
          throw new Error('No household ID provided');
        }

        const api = getApi();
        if (!api) {
          throw new Error('API not initialized');
        }

        set({ loading: true, error: null });
        
        try {
          const response = await api.delete(`/api/households/${householdId}/storage-areas/${storageAreaId}`);
          
          if (response.ok) {
            const responseData = await response.json();
            
            if (responseData.success) {
              toast.success("Storage Area Deleted!", {
                description: `Storage area has been deleted successfully.`,
              });
              
              // Refresh the storage areas list for this household
              const store = get();
              await store.fetchStorageAreas(householdId);
            } else {
              throw new Error(responseData.message || 'Failed to delete storage area');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to delete storage area: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete storage area';
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
      getStorageAreasForHousehold: (householdId: string) => {
        const state = get();
        return state.storageAreasByHousehold[householdId] || [];
      },

      getStorageAreaById: (householdId: string, storageAreaId: string) => {
        const state = get();
        const storageAreas = state.storageAreasByHousehold[householdId] || [];
        return storageAreas.find(area => area.id === storageAreaId) || null;
      },

      getStorageAreasWithStats: (householdId: string) => {
        const state = get();
        const storageAreas = state.storageAreasByHousehold[householdId] || [];
        
        // Import stored items store dynamically to avoid circular dependency
        return storageAreas.map(area => {
          let itemCount = 0;
          let lowStockCount = 0;
          
          try {
            // Get stored items for this storage area
            const storedItemsStore = useStoredItemStore.getState();
            const storedItems = storedItemsStore.getStoredItemsByStorageArea(householdId, area.id);
            
            itemCount = storedItems.length;
            
            // Debug logging
            if (area.name.toLowerCase().includes('freezer')) {
              console.log(`Freezer debug - Area ID: ${area.id}, Household ID: ${householdId}, Items:`, storedItems);
            }
            
            // Calculate low stock count (items expiring within 3 days or already expired)
            const now = new Date();
            lowStockCount = storedItems.filter(item => {
              if (!item.expirationDate) return false;
              const expirationDate = new Date(item.expirationDate);
              const diffDays = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return diffDays <= 3; // Including expired items (negative days)
            }).length;
          } catch (error) {
            // If there's an error accessing the stored items store, use default values
            console.log('Could not access stored items for stats calculation:', error);
          }
          
          return {
            id: area.id,
            name: area.name,
            emoji: area.emoji,
            type: area.type,
            itemCount,
            lowStockCount,
          };
        });
      },
    }),
    { name: 'storage-area-store' }
  )
);

// Helper hook for current household's storage areas
export const useCurrentHouseholdStorageAreas = (currentHouseholdId: string | null) => {
  const loading = useStorageAreaStore(state => state.loading);
  const error = useStorageAreaStore(state => state.error);
  const createStorageArea = useStorageAreaStore(state => state.createStorageArea);
  const updateStorageArea = useStorageAreaStore(state => state.updateStorageArea);
  const deleteStorageArea = useStorageAreaStore(state => state.deleteStorageArea);

  return {
    loading,
    error,
    createStorageArea: (data: CreateStorageAreaData) => 
      currentHouseholdId ? createStorageArea(currentHouseholdId, data) : Promise.reject(new Error('No household selected')),
    updateStorageArea: (storageAreaId: string, data: UpdateStorageAreaData) =>
      currentHouseholdId ? updateStorageArea(currentHouseholdId, storageAreaId, data) : Promise.reject(new Error('No household selected')),
    deleteStorageArea: (storageAreaId: string) =>
      currentHouseholdId ? deleteStorageArea(currentHouseholdId, storageAreaId) : Promise.reject(new Error('No household selected')),
  };
};

// Hook for getting storage areas with stats (use this for display lists)
export const useStorageAreasWithStats = (currentHouseholdId: string | null) => {
  const storageAreasByHousehold = useStorageAreaStore(state => state.storageAreasByHousehold);
  const fetchStorageAreas = useStorageAreaStore(state => state.fetchStorageAreas);
  
  // Subscribe to stored items changes to refresh stats
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  
  React.useEffect(() => {
    if (!currentHouseholdId) return;
    
    // Subscribe to stored items store changes
    const unsubscribe = useStoredItemStore.subscribe(() => {
      // Force a re-render when stored items change
      forceUpdate();
    });
    
    return unsubscribe;
  }, [currentHouseholdId]);

  // Compute values from stable references to avoid infinite loops
  const storageAreas = currentHouseholdId ? (storageAreasByHousehold[currentHouseholdId] || []) : [];
  
  // Memoize the stats computation to prevent infinite re-renders
  const storageAreasWithStats = useMemo(() => {
    if (!currentHouseholdId || storageAreas.length === 0) {
      return [];
    }
    
    // Calculate stats directly here to avoid function dependency issues
    return storageAreas.map(area => {
      let itemCount = 0;
      let lowStockCount = 0;
      
      try {
        // Get stored items for this storage area
        const storedItemsStore = useStoredItemStore.getState();
        const storedItems = storedItemsStore.getStoredItemsByStorageArea(currentHouseholdId, area.id);
        
        itemCount = storedItems.length;
        
        // Calculate low stock count (items expiring within 3 days or already expired)
        const now = new Date();
        lowStockCount = storedItems.filter(item => {
          if (!item.expirationDate) return false;
          const expirationDate = new Date(item.expirationDate);
          const diffDays = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 3; // Including expired items (negative days)
        }).length;
      } catch (error) {
        // If there's an error accessing the stored items store, use default values
        console.log('Could not access stored items for stats calculation:', error);
      }
      
      return {
        id: area.id,
        name: area.name,
        emoji: area.emoji,
        type: area.type,
        itemCount,
        lowStockCount,
      };
    });
  }, [storageAreas, currentHouseholdId]);

  return {
    storageAreas,
    storageAreasWithStats,
    fetchStorageAreas: (householdId?: string) => {
      const targetHouseholdId = householdId || currentHouseholdId;
      if (!targetHouseholdId) {
        console.warn('fetchStorageAreas: No household ID available');
        return Promise.resolve();
      }
      
      // Check if API is initialized before attempting fetch
      if (!apiInstance) {
        console.log('fetchStorageAreas: API not yet initialized, skipping fetch');
        return Promise.resolve();
      }
      
      return fetchStorageAreas(targetHouseholdId);
    },
  };
}; 