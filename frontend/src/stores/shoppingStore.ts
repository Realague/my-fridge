import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { toast } from 'sonner';

export interface ShoppingItem {
  id: string;
  item?: {
    id: string;
    name: string;
    category: string;
    defaultUnit: string;
    availableUnits: string[];
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
}

interface ShoppingStore {
  // State
  items: ShoppingItem[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchShoppingItems: (householdId: string, completed?: boolean) => Promise<void>;
  createShoppingItem: (householdId: string, itemData: CreateShoppingItemRequest) => Promise<ShoppingItem | null>;
  updateShoppingItem: (householdId: string, id: string, updates: UpdateShoppingItemRequest) => Promise<boolean>;
  deleteShoppingItem: (householdId: string, id: string) => Promise<boolean>;
  toggleShoppingItemCompleted: (householdId: string, id: string) => Promise<boolean>;
  bulkUpdateCompleted: (householdId: string, ids: string[], completed: boolean) => Promise<boolean>;
  clearCompleted: (householdId: string) => Promise<boolean>;
  reorderItems: (householdId: string, itemPriorities: Array<{ id: string; priority: number }>) => Promise<boolean>;
  
  // Internal actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed getters
  getPendingItems: () => ShoppingItem[];
  getCompletedItems: () => ShoppingItem[];
  getItemsByCategory: (category: string) => ShoppingItem[];
  getTotalItems: () => number;
  getCompletedCount: () => number;
}

// Create API instance outside the store to avoid circular dependencies
let apiInstance: ReturnType<typeof useApiWithAuth> | null = null;

const getApi = () => {
  if (!apiInstance) {
    throw new Error('API instance not initialized. Make sure to call initializeShoppingStore.');
  }
  return apiInstance;
};

export const initializeShoppingStore = (api: ReturnType<typeof useApiWithAuth>) => {
  apiInstance = api;
};

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

      fetchShoppingItems: async (householdId: string, completed?: boolean) => {
        set({ loading: true, error: null });
        
        try {
          const api = getApi();
          const searchParams = new URLSearchParams();
          
          if (completed !== undefined) searchParams.append('completed', completed.toString());
          
          const queryString = searchParams.toString();
          const url = `/api/households/${householdId}/shopping${queryString ? `?${queryString}` : ''}`;
          
          const response = await api.get(url);
          
          if (response.ok) {
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
          } else {
            const errorText = await response.text();
            console.error('fetchShoppingItems: Error response:', errorText);
            throw new Error(`Failed to fetch shopping items: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch shopping items';
          set({ error: message });
          console.error('fetchShoppingItems: Error:', error);
          toast.error(message);
        } finally {
          set({ loading: false });
        }
      },

      createShoppingItem: async (householdId: string, itemData: CreateShoppingItemRequest) => {
        set({ error: null });
        
        try {
          const api = getApi();
          const response = await api.post(`/api/households/${householdId}/shopping`, itemData);
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              const newItem = result.data;
              set(state => ({ 
                items: [...state.items, newItem] 
              }));
              toast.success(`Added ${newItem.item?.name || 'item'} to shopping list`);
              return newItem;
            } else {
              throw new Error(result.error || 'Failed to create shopping item');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create shopping item');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create shopping item';
          set({ error: message });
          console.error('createShoppingItem: Error:', error);
          toast.error(message);
          return null;
        }
      },

      updateShoppingItem: async (householdId: string, id: string, updates: UpdateShoppingItemRequest) => {
        set({ error: null });
        
        try {
          const api = getApi();
          const response = await api.put(`/api/households/${householdId}/shopping/${id}`, updates);
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              const updatedItem = result.data;
              set(state => ({
                items: state.items.map(item => 
                  item.id === id ? updatedItem : item
                )
              }));
              toast.success('Item updated');
              return true;
            } else {
              throw new Error(result.error || 'Failed to update shopping item');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update shopping item');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update shopping item';
          set({ error: message });
          console.error('updateShoppingItem: Error:', error);
          toast.error(message);
          return false;
        }
      },

      deleteShoppingItem: async (householdId: string, id: string) => {
        set({ error: null });
        
        try {
          const api = getApi();
          const response = await api.delete(`/api/households/${householdId}/shopping/${id}`);
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              set(state => ({
                items: state.items.filter(item => item.id !== id)
              }));
              toast.success('Item removed from shopping list');
              return true;
            } else {
              throw new Error(result.error || 'Failed to delete shopping item');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete shopping item');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete shopping item';
          set({ error: message });
          console.error('deleteShoppingItem: Error:', error);
          toast.error(message);
          return false;
        }
      },

      toggleShoppingItemCompleted: async (householdId: string, id: string) => {
        set({ error: null });
        
        try {
          const api = getApi();
          const response = await api.patch(`/api/households/${householdId}/shopping/${id}/toggle`);
          
          if (response.ok) {
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
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to toggle shopping item completion');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to toggle shopping item completion';
          set({ error: message });
          console.error('toggleShoppingItemCompleted: Error:', error);
          toast.error(message);
          return false;
        }
      },

      bulkUpdateCompleted: async (householdId: string, ids: string[], completed: boolean) => {
        set({ error: null });
        
        try {
          const api = getApi();
          const response = await api.put(`/api/households/${householdId}/shopping/bulk-update`, { ids, completed });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              set(state => ({
                items: state.items.map(item => 
                  ids.includes(item.id) ? { ...item, completed } : item
                )
              }));
              toast.success(`${completed ? 'Completed' : 'Uncompleted'} ${ids.length} items`);
              return true;
            } else {
              throw new Error(result.error || 'Failed to bulk update shopping items');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to bulk update shopping items');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to bulk update shopping items';
          set({ error: message });
          console.error('bulkUpdateCompleted: Error:', error);
          toast.error(message);
          return false;
        }
      },

      clearCompleted: async (householdId: string) => {
        set({ error: null });
        
        try {
          const api = getApi();
          const response = await api.delete(`/api/households/${householdId}/shopping/completed`);
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              set(state => ({
                items: state.items.filter(item => !item.completed)
              }));
              toast.success('Completed items cleared');
              return true;
            } else {
              throw new Error(result.error || 'Failed to clear completed shopping items');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to clear completed shopping items');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to clear completed shopping items';
          set({ error: message });
          console.error('clearCompleted: Error:', error);
          toast.error(message);
          return false;
        }
      },

      reorderItems: async (householdId: string, itemPriorities: Array<{ id: string; priority: number }>) => {
        set({ error: null });
        
        try {
          const api = getApi();
          const response = await api.put(`/api/households/${householdId}/shopping/reorder`, { itemPriorities });
          
          if (response.ok) {
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
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to reorder shopping items');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to reorder shopping items';
          set({ error: message });
          console.error('reorderItems: Error:', error);
          toast.error(message);
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
    }),
    {
      name: 'shopping-store',
    }
  )
); 