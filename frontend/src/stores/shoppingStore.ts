import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { useHouseholdStore } from './householdStore';

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
  completed: boolean;
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
}

export interface UpdateShoppingItemRequest {
  quantity?: string;
  unit?: string;
  completed?: boolean;
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
  fetchShoppingItems: (completed?: boolean) => Promise<void>;
  createShoppingItem: (itemData: CreateShoppingItemRequest) => Promise<ShoppingItem | null>;
  updateShoppingItem: (id: string, updates: UpdateShoppingItemRequest) => Promise<boolean>;
  deleteShoppingItem: (id: string) => Promise<boolean>;
  toggleShoppingItemCompleted: (id: string) => Promise<boolean>;
  bulkUpdateCompleted: (ids: string[], completed: boolean) => Promise<boolean>;
  bulkTransferToStorage: (request: BulkTransferToStorageRequest) => Promise<boolean>;
  clearCompleted: () => Promise<boolean>;
  reorderItems: (itemPriorities: Array<{ id: string; priority: number }>) => Promise<boolean>;
  
  // Internal actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Item deletion cleanup
  removeShoppingItemsByItemId: (itemId: string) => void;
  
  // Computed getters
  getPendingItems: () => ShoppingItem[];
  getCompletedItems: () => ShoppingItem[];
  getItemsByCategory: (category: string) => ShoppingItem[];
  getTotalItems: () => number;
  getCompletedCount: () => number;
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

      fetchShoppingItems: async (completed?: boolean) => {
        set({ loading: true, error: null });
        
        try {
          const searchParams = new URLSearchParams();
          
          if (completed !== undefined) searchParams.append('completed', completed.toString());

          const householdId = getHouseholdId();
          if (!householdId) {
            throw new Error('No household available');
          }
          
          const queryString = searchParams.toString();
          
          const response = await apiService.get(`/api/households/${householdId}/shopping${queryString ? `?${queryString}` : ''}`);
          const result = await response.json();
          
          if (result.success && result.data) {
            const newItems = result.data.items || [];
            
            if (completed === undefined) {
              // Fetching all items - replace the entire array
              set({ items: newItems });
            } else {
              // Fetching specific completion state - merge with existing items
              set(state => {
                // Remove existing items with the same completion state
                const filteredItems = state.items.filter(item => item.completed !== completed);
                // Add the new items
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
            return true;
          } else {
            throw new Error(result.error || 'Failed to delete shopping item');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete shopping item';
          set({ error: message });
          console.error('deleteShoppingItem: Error:', error);
          return false;
        }
      },

      toggleShoppingItemCompleted: async (id: string) => {
        set({ error: null });
        
        try { 
          const householdId = getHouseholdId();
          if (!householdId) {
            throw new Error('No household available');
          }

          const response = await apiService.patch(`/api/households/${householdId}/shopping/${id}/toggle`);
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
            throw new Error(result.error || 'Failed to toggle shopping item completion');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to toggle shopping item completion';
          set({ error: message });
          console.error('toggleShoppingItemCompleted: Error:', error);
          return false;
        }
      },

      bulkUpdateCompleted: async (ids: string[], completed: boolean) => {
        set({ error: null });
        
        try {
          const householdId = getHouseholdId();
          if (!householdId) {
            throw new Error('No household available');
          }

          const response = await apiService.put(`/api/households/${householdId}/shopping/bulk-update`, { ids, completed });
          const result = await response.json();
          
          if (result.success) {
            set(state => ({
              items: state.items.map(item => 
                ids.includes(item.id) ? { ...item, completed } : item
              )
            }));
            return true;
          } else {
            throw new Error(result.error || 'Failed to bulk update shopping items');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to bulk update shopping items';
          set({ error: message });
          console.error('bulkUpdateCompleted: Error:', error);
          return false;
        }
      },

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
            const updatedItems: ShoppingItem[] = result.data;
            set(state => {
              const updatedIds = new Set(updatedItems.map((i: ShoppingItem) => i.id));
              return {
                items: state.items.map(item =>
                  updatedIds.has(item.id)
                    ? updatedItems.find((u: ShoppingItem) => u.id === item.id) || item
                    : item
                ),
              };
            });
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

      clearCompleted: async () => {
        set({ error: null });
        
        try {
          const householdId = getHouseholdId();
          if (!householdId) {
            throw new Error('No household available');
          }

          const response = await apiService.delete(`/api/households/${householdId}/shopping/completed`);
          const result = await response.json();
          
          if (result.success) {
            set(state => ({
              items: state.items.filter(item => !item.completed)
            }));
            return true;
          } else {
            throw new Error(result.error || 'Failed to clear completed shopping items');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to clear completed shopping items';
          set({ error: message });
          console.error('clearCompleted: Error:', error);
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
      getPendingItems: () => {
        const items = get().items;
        return items.filter(item => !item.completed);
      },

      getCompletedItems: () => {
        const items = get().items;
        return items.filter(item => item.completed);
      },

      getItemsByCategory: (category: string) => {
        const items = get().items;
        if (category === 'All') return items;
        return items.filter(item => item.item?.category === category);
      },

      getTotalItems: () => {
        return get().items.length;
      },

      getCompletedCount: () => {
        const items = get().items;
        return items.filter(item => item.completed).length;
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