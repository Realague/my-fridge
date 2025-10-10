import React, { useMemo } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useStoredItemStore } from './storedItemStore';
import { createStorageAreaApiService, StorageArea, CreateStorageAreaData, UpdateStorageAreaData } from '@/services/storageAreaService';
import { useHouseholdStore } from './householdStore';
import { StorageAreaType } from '@/types/enums';

// Import StorageArea from service
// export interface StorageArea - moved to service

export interface StorageAreaWithStats {
  id: string;
  name: string;
  emoji: string;
  type: StorageAreaType;
  itemCount: number;
  lowStockCount: number;
}

interface StorageAreaStore {
  // State - organized by household ID for efficient caching
  storageAreasByHousehold: Record<string, StorageArea[]>;
  loading: boolean;
  error: string | null;
  

  // Actions
  fetchStorageAreas: () => Promise<void>;
  createStorageArea: (data: CreateStorageAreaData) => Promise<StorageArea>;
  updateStorageArea: (storageAreaId: string, data: UpdateStorageAreaData) => Promise<void>;
  deleteStorageArea: (storageAreaId: string) => Promise<void>;
  
  // Internal actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStorageAreasForHousehold: (storageAreas: StorageArea[]) => void;
  clearStorageAreasForHousehold: () => void;
  
  // Computed getters
  getStorageAreasForHousehold: () => StorageArea[];
  getStorageAreaById: (storageAreaId: string) => StorageArea | null;
  getStorageAreasWithStats: () => StorageAreaWithStats[];
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

// Create API service instance
const apiService = createStorageAreaApiService();

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
      
      setStorageAreasForHousehold: (storageAreas: StorageArea[]) => {
        const householdId = getHouseholdId();
        set(state => ({
          storageAreasByHousehold: {
            ...state.storageAreasByHousehold,
            [householdId]: storageAreas,
          }
        }));
      },

      clearStorageAreasForHousehold: () => {
        const householdId = getHouseholdId();
        set(state => {
          const newStorageAreas = { ...state.storageAreasByHousehold };
          delete newStorageAreas[householdId];
          return { storageAreasByHousehold: newStorageAreas };
        });
      },

      fetchStorageAreas: async () => {
        const householdId = getHouseholdId();
        if (!householdId) {
          return;
        }

        set({ loading: true, error: null });
        
        try {
          const storageAreas = await apiService.getStorageAreas(householdId);
          const store = get();
          store.setStorageAreasForHousehold(storageAreas);
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

      createStorageArea: async (data: CreateStorageAreaData) => {
        const householdId = getHouseholdId();
        if (!householdId) {
          throw new Error('No household ID provided');
        }

        set({ loading: true, error: null });
        
        try {
          const createdArea = await apiService.createStorageArea(householdId, data);
          
          // Refresh the storage areas list for this household
          const store = get();
          await store.fetchStorageAreas();
          return createdArea;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create storage area';
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateStorageArea: async (storageAreaId: string, data: UpdateStorageAreaData) => {
        const householdId = getHouseholdId();
        if (!householdId) {
          throw new Error('No household ID provided');
        }

        set({ loading: true, error: null });
        
        try {
          await apiService.updateStorageArea(householdId, storageAreaId, data);
          
          // Refresh the storage areas list for this household
          const store = get();
          await store.fetchStorageAreas();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update storage area';
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteStorageArea: async (storageAreaId: string) => {
        const householdId = getHouseholdId();
        if (!householdId) {
          throw new Error('No household ID provided');
        }

        set({ loading: true, error: null });
        
        try {
          await apiService.deleteStorageArea(householdId, storageAreaId);
          
          // Refresh the storage areas list for this household
          const store = get();
          await store.fetchStorageAreas();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete storage area';
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      // Computed getters
      getStorageAreasForHousehold: () => {
        const householdId = getHouseholdId();
        const state = get();
        return state.storageAreasByHousehold[householdId] || [];
      },

      getStorageAreaById: (storageAreaId: string) => {
        const householdId = getHouseholdId();
        const state = get();
        const storageAreas = state.storageAreasByHousehold[householdId] || [];
        return storageAreas.find(area => area.id === storageAreaId) || null;
      },

      getStorageAreasWithStats: () => {
        const householdId = getHouseholdId();
        const state = get();
        const storageAreas = state.storageAreasByHousehold[householdId] || [];
        
        // Import stored items store dynamically to avoid circular dependency
        return storageAreas.map(area => {
          let itemCount = 0;
          let lowStockCount = 0;
          
          try {
            // Get stored items for this storage area
            const storedItemsStore = useStoredItemStore.getState();
            const storedItems = storedItemsStore.getStoredItemsByStorageArea(area.id);
            
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
            console.error('Could not access stored items for stats calculation:', error);
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
      currentHouseholdId ? createStorageArea(data) : Promise.reject(new Error('No household selected')),
    updateStorageArea: (storageAreaId: string, data: UpdateStorageAreaData) =>
      currentHouseholdId ? updateStorageArea(storageAreaId, data) : Promise.reject(new Error('No household selected')),
    deleteStorageArea: (storageAreaId: string) =>
      currentHouseholdId ? deleteStorageArea(storageAreaId) : Promise.reject(new Error('No household selected')),
  };
};

// Hook for getting storage areas with stats (use this for display lists)
export const useStorageAreasWithStats = (currentHouseholdId: string | null) => {
  const storageAreasByHousehold = useStorageAreaStore(state => state.storageAreasByHousehold);
  const fetchStorageAreas = useStorageAreaStore(state => state.fetchStorageAreas);
  
  // Subscribe to stored items changes to get proper reactivity
  const storedItemsByHousehold = useStoredItemStore(state => state.storedItemsByHousehold);
  
  // Compute values from stable references to avoid infinite loops
  const storageAreas = currentHouseholdId ? (storageAreasByHousehold[currentHouseholdId] || []) : [];
  const storedItems = currentHouseholdId ? (storedItemsByHousehold[currentHouseholdId] || []) : [];
  
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
        // Get stored items for this storage area from the reactive state
        const areaStoredItems = storedItems.filter(item => item.storageAreaId === area.id);
        
        itemCount = areaStoredItems.length;
        
        // Calculate low stock count (items expiring within 3 days or already expired)
        const now = new Date();
        lowStockCount = areaStoredItems.filter(item => {
          if (!item.expirationDate) return false;
          const expirationDate = new Date(item.expirationDate);
          const diffDays = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 3; // Including expired items (negative days)
        }).length;
      } catch (error) {
        // If there's an error accessing the stored items store, use default values
        console.error('Could not access stored items for stats calculation:', error);
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
  }, [storageAreas, storedItems, currentHouseholdId]);

  return {
    storageAreas,
    storageAreasWithStats,
    fetchStorageAreas: () => fetchStorageAreas(),
  };
}; 