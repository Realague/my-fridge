import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { toast } from 'sonner';
import i18n from '@/i18n/config';
import { getItemDisplayName } from '@/utils/itemUtils';
import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { useHouseholdStore } from './householdStore';
import { ShoppingItemStatus } from '@/types/enums';

export interface ShoppingItem {
  id: string;
  item?: {
    id: string;
    name: string;
    category: string;
    defaultUnit: string;
    availableUnits: string[];
    imageUrl: string | null;
    createdBy: string | null;
    householdId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  householdId: string;
  quantity: string;
  unit: string;
  status: ShoppingItemStatus;
  priority: number;
  storedItemId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    displayName: string;
  };
}

export interface CreateShoppingItemRequest {
  itemId: string;
  quantity: string;
  unit: string;
  priority?: number;
  /** Set to TO_STORE to add the item directly to "À ranger" (e.g. a scan). */
  status?: ShoppingItemStatus;
}

export interface UpdateShoppingItemRequest {
  quantity?: string;
  unit?: string;
  status?: ShoppingItemStatus;
  priority?: number;
  storedItemId?: string;
}

export interface BulkTransferToStorageItem {
  shoppingItemId: string;
  storageAreaId: string;
  expirationDate?: string;
  location?: string;
}

export interface BulkTransferToStorageRequest {
  items: BulkTransferToStorageItem[];
}

interface ShoppingStore {
  // State
  items: ShoppingItem[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchShoppingItems: (status?: ShoppingItemStatus) => Promise<void>;
  createShoppingItem: (itemData: CreateShoppingItemRequest) => Promise<ShoppingItem | null>;
  updateShoppingItem: (id: string, updates: UpdateShoppingItemRequest) => Promise<boolean>;
  deleteShoppingItem: (id: string) => Promise<boolean>;
  setStatus: (id: string, status: ShoppingItemStatus) => Promise<boolean>;
  moveToStore: (id: string) => Promise<boolean>;
  moveToBuy: (id: string) => Promise<boolean>;
  bulkTransferToStorage: (request: BulkTransferToStorageRequest) => Promise<boolean>;
  reorderItems: (itemPriorities: Array<{ id: string; priority: number }>) => Promise<boolean>;

  // Internal actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Item deletion cleanup
  removeShoppingItemsByItemId: (itemId: string) => void;

  // Computed getters
  getToBuyItems: () => ShoppingItem[];
  getToStoreItems: () => ShoppingItem[];
  getItemsByCategory: (category: string) => ShoppingItem[];
  getTotalItems: () => number;
  getToStoreCount: () => number;
}

// Non-hook API service for use in stores
const createApiService = () => {
  const makeApiCall = async (url: string, options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; body?: any; headers?: Record<string, string>; } = {}) => {
    const response = await makeAuthenticatedApiCall(url, options, {
      showToast: false // Let individual stores handle their own error messaging
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response;
  };

  return {
    get: (url: string, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'GET', headers }),
    post: (url: string, body?: any, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'POST', body, headers }),
    put: (url: string, body?: any, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'PUT', body, headers }),
    patch: (url: string, body?: any, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'PATCH', body, headers }),
    delete: (url: string, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'DELETE', headers }),
  };
};

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

const apiService = createApiService();

export const useShoppingStore = create<ShoppingStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      items: [],
      loading: false,
      error: null,

      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      fetchShoppingItems: async (status?: ShoppingItemStatus) => {
        set({ loading: true, error: null });

        try {
          const searchParams = new URLSearchParams();

          if (status !== undefined) searchParams.append('status', status);

          const householdId = getHouseholdId();
          if (!householdId) {
            throw new Error('No household available');
          }

          const queryString = searchParams.toString();

          const response = await apiService.get(`/api/households/${householdId}/shopping${queryString ? `?${queryString}` : ''}`);
          const result = await response.json();

          if (result.success && result.data) {
            const newItems = result.data.items || [];

            if (status === undefined) {
              // Fetching all items - replace the entire array
              set({ items: newItems });
            } else {
              // Fetching a specific status - merge with existing items
              set(state => {
                const filteredItems = state.items.filter(item => item.status !== status);
                return { items: [...filteredItems, ...newItems] };
              });
            }
          } else {
            throw new Error(result.error || 'Failed to fetch shopping items');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch shopping items';
          set({ error: message });
          console.error('fetchShoppingItems: Error:', error);
        } finally {
          set({ loading: false });
        }
      },

      createShoppingItem: async (itemData: CreateShoppingItemRequest) => {
        set({ error: null });
        
        try {
          const householdId = getHouseholdId();
          if (!householdId) {
            throw new Error('No household available');
          }

          const response = await apiService.post(`/api/households/${householdId}/shopping`, itemData);
          const result = await response.json();
          
          if (result.success && result.data) {
            const newItem = result.data;
            set(state => {
              const existingIndex = state.items.findIndex(item => item.id === newItem.id);
              if (existingIndex !== -1) {
                // Backend merged into an existing item — replace it in place
                const updated = [...state.items];
                updated[existingIndex] = newItem;
                return { items: updated };
              }
              return { items: [...state.items, newItem] };
            });
            return newItem;
          } else {
            throw new Error(result.error || 'Failed to create shopping item');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create shopping item';
          set({ error: message });
          console.error('createShoppingItem: Error:', error);
          return null;
        }
      },

      updateShoppingItem: async (id: string, updates: UpdateShoppingItemRequest) => {
        set({ error: null });
        
        try {
          const householdId = getHouseholdId();
          if (!householdId) {
            throw new Error('No household available');
          }

          const response = await apiService.put(`/api/households/${householdId}/shopping/${id}`, updates);
          const result = await response.json();
          
          if (result.success && result.data) {
            const updatedItem = result.data;
            set(state => ({
              items: state.items.map(item => 
                item.id === id ? updatedItem : item
              )
            }));
            return true;
          } else {
            throw new Error(result.error || 'Failed to update shopping item');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update shopping item';
          set({ error: message });
          console.error('updateShoppingItem: Error:', error);
          return false;
        }
      },

      deleteShoppingItem: async (id: string) => {
        set({ error: null });

        // Snapshot the item before delete so the undo path can recreate it
        // verbatim. Mirrors storedItemStore.deleteStoredItem (Fix #2).
        const snapshot = get().items.find((it) => it.id === id);

        try {
          const householdId = getHouseholdId();
          if (!householdId) {
            throw new Error('No household available');
          }

          const response = await apiService.delete(`/api/households/${householdId}/shopping/${id}`);
          const result = await response.json();

          if (result.success) {
            set(state => ({
              items: state.items.filter(item => item.id !== id)
            }));

            const itemName = snapshot?.item
              ? getItemDisplayName(snapshot.item as never, i18n.t.bind(i18n))
              : i18n.t('messages.storedItem.unnamed');

            toast.success(i18n.t('messages.shoppingItem.deleted', { name: itemName }), {
              duration: 8000,
              action: snapshot && snapshot.item
                ? {
                    label: i18n.t('messages.storedItem.undo'),
                    onClick: async () => {
                      try {
                        const recreated = await get().createShoppingItem({
                          itemId: snapshot.item!.id,
                          quantity: snapshot.quantity,
                          unit: snapshot.unit,
                          priority: snapshot.priority,
                        });
                        if (recreated) {
                          toast.success(i18n.t('messages.shoppingItem.restored', { name: itemName }));
                        }
                      } catch (err) {
                        console.error('shoppingItem restore failed:', err);
                        toast.error(i18n.t('messages.storedItem.restoreFailed'));
                      }
                    },
                  }
                : undefined,
            });

            return true;
          } else {
            throw new Error(result.error || 'Failed to delete shopping item');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : i18n.t('messages.shoppingItem.deleteFailed');
          set({ error: message });
          console.error('deleteShoppingItem: Error:', error);
          toast.error(i18n.t('messages.shoppingItem.deleteFailed'));
          return false;
        }
      },

      // Shared status-transition helper with optimistic update: the row moves
      // between sections instantly, then the server response reconciles.
      setStatus: async (id: string, status: ShoppingItemStatus) => {
        set({ error: null });

        // Snapshot for rollback, then flip locally for an instant transition.
        const snapshot = get().items;
        set(state => ({
          items: state.items.map(item =>
            item.id === id ? { ...item, status } : item
          ),
        }));

        try {
          const householdId = getHouseholdId();
          if (!householdId) {
            throw new Error('No household available');
          }

          const response = await apiService.patch(
            `/api/households/${householdId}/shopping/${id}/status`,
            { status }
          );
          const result = await response.json();

          if (result.success && result.data) {
            const updatedItem = result.data as ShoppingItem;
            set(state => ({
              items: state.items.map(item =>
                item.id === id ? updatedItem : item
              ),
            }));
            return true;
          } else {
            throw new Error(result.error || 'Failed to update shopping item status');
          }
        } catch (error) {
          // Revert the optimistic change.
          set({ items: snapshot });
          const message = error instanceof Error ? error.message : 'Failed to update shopping item status';
          set({ error: message });
          console.error('setStatus: Error:', error);
          return false;
        }
      },

      moveToStore: async (id: string) => get().setStatus(id, ShoppingItemStatus.TO_STORE),
      moveToBuy: async (id: string) => get().setStatus(id, ShoppingItemStatus.TO_BUY),

      bulkTransferToStorage: async (request: BulkTransferToStorageRequest) => {
        set({ error: null });

        try {
          const householdId = getHouseholdId();
          if (!householdId) {
            throw new Error('No household available');
          }

          const response = await apiService.post(
            `/api/households/${householdId}/shopping/bulk-to-storage`,
            request
          );
          const result = await response.json();

          if (result.success && result.data) {
            // Stored items leave the shopping list entirely; drop the returned ids.
            const removedIds = new Set<string>(result.data.removedShoppingItemIds || []);
            set(state => ({
              items: state.items.filter(item => !removedIds.has(item.id)),
            }));
            return true;
          } else {
            throw new Error(result.error || 'Failed to bulk transfer to storage');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to bulk transfer to storage';
          set({ error: message });
          console.error('bulkTransferToStorage: Error:', error);
          return false;
        }
      },

      reorderItems: async (itemPriorities: Array<{ id: string; priority: number }>) => {
        set({ error: null });
        
        try {
          const householdId = getHouseholdId();
          if (!householdId) {
            throw new Error('No household available');
          }

          const response = await apiService.put(`/api/households/${householdId}/shopping/reorder`, { itemPriorities });
          const result = await response.json();
          
          if (result.success) {
            // Update local state with new priorities
            set(state => ({
              items: state.items.map(item => {
                const priorityUpdate = itemPriorities.find(p => p.id === item.id);
                return priorityUpdate ? { ...item, priority: priorityUpdate.priority } : item;
              }).sort((a, b) => b.priority - a.priority)
            }));
            return true;
          } else {
            throw new Error(result.error || 'Failed to reorder shopping items');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to reorder shopping items';
          set({ error: message });
          console.error('reorderItems: Error:', error);
          return false;
        }
      },

      // Computed getters
      getToBuyItems: () => {
        const items = get().items;
        return items.filter(item => item.status === ShoppingItemStatus.TO_BUY);
      },

      getToStoreItems: () => {
        const items = get().items;
        return items.filter(item => item.status === ShoppingItemStatus.TO_STORE);
      },

      getItemsByCategory: (category: string) => {
        const items = get().items;
        if (category === 'All') return items;
        return items.filter(item => item.item?.category === category);
      },

      getTotalItems: () => {
        return get().items.length;
      },

      getToStoreCount: () => {
        const items = get().items;
        return items.filter(item => item.status === ShoppingItemStatus.TO_STORE).length;
      },

      removeShoppingItemsByItemId: (itemId: string) => {
        set(state => ({
          items: state.items.filter(item => item.item?.id !== itemId)
        }));
      },
    }),
    {
      name: 'shopping-store',
    }
  )
); 