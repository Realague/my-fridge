import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { toast } from 'sonner';
import i18n from '@/i18n/config';
import { StoredItem, CreateStoredItemRequest, UpdateStoredItemRequest, GetStoredItemsRequest, storedItemService } from '@/services/storedItemService';
import { ItemCategory } from '@/types/enums';
import { getItemDisplayName } from '@/utils/itemUtils';
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
  markAsOpened: (id: string, openedDate?: string) => Promise<void>;
  consumePortion: (id: string) => Promise<{ remaining: StoredItem | null }>;
  
  // Internal actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStoredItemsForHousehold: (storedItems: StoredItem[]) => void;
  clearStoredItemsForHousehold: () => void;
  addStoredItemToHousehold: (storedItem: StoredItem) => void;
  updateStoredItemInHousehold: (storedItem: StoredItem) => void;
  removeStoredItemFromHousehold: (storedItemId: string) => void;
  
  // Item deletion cleanup
  removeStoredItemsByItemId: (itemId: string) => void;
  
  // Computed getters
  getStoredItemsForHousehold: () => StoredItem[];
  getStoredItemById: (storedItemId: string) => StoredItem | null;
  getStoredItemsByStorageArea: (storageAreaId: string) => StoredItem[];
  getStoredItemsByItemAndUnit: (itemId: string, unit: string) => StoredItem[];
  getTotalQuantityForItem: (itemId: string) => any;
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

      removeStoredItemsByItemId: (itemId: string) => {
        const householdId = getHouseholdId();
        if (!householdId) return;
        
        set(state => ({
          storedItemsByHousehold: {
            ...state.storedItemsByHousehold,
            [householdId]: (state.storedItemsByHousehold[householdId] || []).filter(item => item.itemId !== itemId)
          }
        }));
      },

      fetchStoredItems: async (params?: GetStoredItemsRequest) => {
        const householdId = getHouseholdId();
        if (!householdId) {
          return;
        }

        set({ loading: true, error: null });
        
        try {
          const result = await storedItemService.getStoredItems(householdId, params);
          const store = get();
          store.setStoredItemsForHousehold(result.items || []);
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

        set({ loading: true, error: null });
        
        try {
          const items = await storedItemService.getStoredItemsByStorageArea(householdId, storageAreaId);
          const store = get();
          store.setStoredItemsForHousehold(items);
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

        set({ loading: true, error: null });
        
        try {
          const items = await storedItemService.getExpiringItems(householdId, days);
          const store = get();
          store.setStoredItemsForHousehold(items);
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

        set({ loading: true, error: null });
        
        try {
          const items = await storedItemService.getExpiredItems(householdId);
          const store = get();
          store.setStoredItemsForHousehold(items);
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

        set({ loading: true, error: null });

        try {
          const createdItem = await storedItemService.createStoredItem(householdId, data);

          const itemName = createdItem.item
            ? getItemDisplayName(createdItem.item as never, i18n.t.bind(i18n))
            : i18n.t('messages.storedItem.unnamed');

          toast.success(i18n.t('messages.storedItem.created', { name: itemName }));

          get().addStoredItemToHousehold(createdItem);
          return createdItem;
        } catch (error) {
          const message = error instanceof Error ? error.message : i18n.t('messages.storedItem.createFailed');
          set({ error: message });
          toast.error(i18n.t('messages.storedItem.createFailed'), { description: message });
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

        set({ loading: true, error: null });

        try {
          const updatedItem = await storedItemService.updateStoredItem(householdId, id, data);

          const itemName = updatedItem.item
            ? getItemDisplayName(updatedItem.item as never, i18n.t.bind(i18n))
            : i18n.t('messages.storedItem.unnamed');

          toast.success(i18n.t('messages.storedItem.updated', { name: itemName }));

          get().updateStoredItemInHousehold(updatedItem);
        } catch (error) {
          const message = error instanceof Error ? error.message : i18n.t('messages.storedItem.updateFailed');
          set({ error: message });
          toast.error(i18n.t('messages.storedItem.updateFailed'), { description: message });
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

        // Snapshot before deletion so we can restore on undo.
        const snapshot = get().getStoredItemById(id);

        set({ loading: true, error: null });

        try {
          await storedItemService.deleteStoredItem(householdId, id);
          get().removeStoredItemFromHousehold(id);

          const itemName = snapshot?.item
            ? getItemDisplayName(snapshot.item as never, i18n.t.bind(i18n))
            : i18n.t('messages.storedItem.unnamed');

          toast.success(i18n.t('messages.storedItem.deleted', { name: itemName }), {
            duration: 8000,
            action: snapshot
              ? {
                  label: i18n.t('messages.storedItem.undo'),
                  onClick: async () => {
                    try {
                      const isCookedMeal = snapshot.item?.category === ItemCategory.COOKED_MEAL;
                      const recreatePayload: CreateStoredItemRequest = {
                        storageAreaId: snapshot.storageAreaId,
                        quantity: Number(snapshot.quantity),
                        unit: snapshot.unit,
                        expirationDate: snapshot.expirationDate ?? undefined,
                        location: snapshot.location ?? undefined,
                        isOpened: snapshot.isOpened,
                        openedDate: snapshot.openedDate ?? undefined,
                        cookedDate: snapshot.cookedDate ?? undefined,
                        ...(isCookedMeal
                          ? {
                              articleType: 'cooked_meal',
                              name: snapshot.item?.name ?? '',
                              recipeId: snapshot.item?.recipeId ?? null,
                            }
                          : { itemId: snapshot.itemId }),
                      };
                      const recreated = await storedItemService.createStoredItem(householdId, recreatePayload);
                      get().addStoredItemToHousehold(recreated);
                      toast.success(i18n.t('messages.storedItem.restored', { name: itemName }));
                    } catch (err) {
                      const m = err instanceof Error ? err.message : '';
                      toast.error(i18n.t('messages.storedItem.restoreFailed'), { description: m });
                    }
                  },
                }
              : undefined,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : i18n.t('messages.storedItem.deleteFailed');
          set({ error: message });
          toast.error(i18n.t('messages.storedItem.deleteFailed'), { description: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      consumePortion: async (id: string) => {
        const householdId = getHouseholdId();
        if (!householdId) {
          throw new Error('No household ID provided');
        }

        try {
          const result = await storedItemService.consumePortion(householdId, id);
          const store = get();
          if (result.remaining) {
            store.updateStoredItemInHousehold(result.remaining);
          } else {
            store.removeStoredItemFromHousehold(id);
          }
          return { remaining: result.remaining };
        } catch (error) {
          const message = error instanceof Error ? error.message : i18n.t('messages.storedItem.consumePortionFailed');
          toast.error(i18n.t('messages.storedItem.consumePortionFailed'), { description: message });
          throw error;
        }
      },

      markAsOpened: async (id: string, openedDate?: string) => {
        const householdId = getHouseholdId();
        if (!householdId) {
          throw new Error('No household ID provided');
        }

        const today = openedDate || new Date().toISOString().split('T')[0];

        set({ loading: true, error: null });
        try {
          // Call the service directly to avoid the duplicate toast that
          // updateStoredItem would emit; we want a single 'opened' toast here.
          const updatedItem = await storedItemService.updateStoredItem(householdId, id, {
            isOpened: true,
            openedDate: today,
          });
          get().updateStoredItemInHousehold(updatedItem);

          const itemName = updatedItem.item
            ? getItemDisplayName(updatedItem.item as never, i18n.t.bind(i18n))
            : i18n.t('messages.storedItem.unnamed');

          toast.success(i18n.t('messages.storedItem.markedAsOpened', { name: itemName }));
        } catch (error) {
          const message = error instanceof Error ? error.message : i18n.t('messages.storedItem.markAsOpenedFailed');
          set({ error: message });
          toast.error(i18n.t('messages.storedItem.markAsOpenedFailed'), { description: message });
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

      getStoredItemsByItemAndUnit: (itemId: string, unit: string) => {
        const householdId = getHouseholdId();
        const state = get();
        const storedItems = state.storedItemsByHousehold[householdId] || [];
        return storedItems.filter(item => item.itemId === itemId && item.unit === unit);
      },

      // Get aggregated quantity for an item across all storage areas
      getTotalQuantityForItem: (itemId: string) => {
        const storedItems = get().getStoredItemsForHousehold();
        const itemStoredItems = storedItems.filter(item => item.itemId === itemId);
        
        if (itemStoredItems.length === 0) return null;

        // Use unit conversion to aggregate
        const { aggregateQuantities } = require('@/utils/unitConversion');
        
        return aggregateQuantities(
          itemStoredItems.map(item => ({
            quantity: item.quantity,
            unit: item.unit,
            storageAreaName: item.storageArea?.name
          }))
        );
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