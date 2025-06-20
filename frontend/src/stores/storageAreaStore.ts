import React, { useMemo } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { toast } from 'sonner';

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
    // This will be set by the provider
    throw new Error('API instance not initialized. Make sure to call initializeStorageAreaStore.');
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

        set({ loading: true, error: null });
        
        try {
          const api = getApi();
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

        set({ loading: true, error: null });
        
        try {
          const api = getApi();
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

        set({ loading: true, error: null });
        
        try {
          const api = getApi();
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

        set({ loading: true, error: null });
        
        try {
          const api = getApi();
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
        return storageAreas.map(area => ({
          id: area.id,
          name: area.name,
          emoji: area.emoji,
          type: area.type,
          itemCount: 0, // TODO: Calculate actual item count when items API is ready
          lowStockCount: 0, // TODO: Calculate actual low stock count when items API is ready
        }));
      },
    }),
    { name: 'storage-area-store' }
  )
);

// Helper hook for current household's storage areas
export const useCurrentHouseholdStorageAreas = (currentHouseholdId: string | null) => {
  const storageAreasByHousehold = useStorageAreaStore(state => state.storageAreasByHousehold);
  const loading = useStorageAreaStore(state => state.loading);
  const error = useStorageAreaStore(state => state.error);
  const fetchStorageAreas = useStorageAreaStore(state => state.fetchStorageAreas);
  const createStorageArea = useStorageAreaStore(state => state.createStorageArea);
  const updateStorageArea = useStorageAreaStore(state => state.updateStorageArea);
  const deleteStorageArea = useStorageAreaStore(state => state.deleteStorageArea);

  // Compute values from stable references to avoid infinite loops
  const storageAreas = currentHouseholdId ? (storageAreasByHousehold[currentHouseholdId] || []) : [];
  
  // Memoize the stats computation to prevent infinite re-renders
  const storageAreasWithStats = useMemo(() => {
    return storageAreas.map(area => ({
      id: area.id,
      name: area.name,
      emoji: area.emoji,
      type: area.type,
      itemCount: 0, // TODO: Calculate actual item count when items API is ready
      lowStockCount: 0, // TODO: Calculate actual low stock count when items API is ready
    }));
  }, [storageAreas]);

  return {
    storageAreas,
    storageAreasWithStats,
    loading,
    error,
    fetchStorageAreas: (householdId?: string) => {
      const targetHouseholdId = householdId || currentHouseholdId;
      if (!targetHouseholdId) {
        console.warn('fetchStorageAreas: No household ID available');
        return Promise.resolve();
      }
      return fetchStorageAreas(targetHouseholdId);
    },
    createStorageArea: (data: CreateStorageAreaData) => 
      currentHouseholdId ? createStorageArea(currentHouseholdId, data) : Promise.reject(new Error('No household selected')),
    updateStorageArea: (storageAreaId: string, data: UpdateStorageAreaData) =>
      currentHouseholdId ? updateStorageArea(currentHouseholdId, storageAreaId, data) : Promise.reject(new Error('No household selected')),
    deleteStorageArea: (storageAreaId: string) =>
      currentHouseholdId ? deleteStorageArea(currentHouseholdId, storageAreaId) : Promise.reject(new Error('No household selected')),
  };
}; 