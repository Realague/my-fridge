import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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
  storedItemId?: string;
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

// Create API service for non-hook usage in stores
const createApiService = () => {
  const makeApiCall = async (url: string, options: RequestInit = {}) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    const token = localStorage.getItem('google_token');
    if (!token) {
      throw new Error('No authentication token');
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
      },
    };

    const response = await fetch(fullUrl, requestOptions);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response;
  };

  return {
    get: (url: string) => makeApiCall(url, { method: 'GET' }),
    post: (url: string, body?: any) => makeApiCall(url, { method: 'POST', body: JSON.stringify(body) }),
    put: (url: string, body?: any) => makeApiCall(url, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (url: string, body?: any) => makeApiCall(url, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (url: string) => makeApiCall(url, { method: 'DELETE' }),
  };
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

      fetchShoppingItems: async (householdId: string, completed?: boolean) => {
        set({ loading: true, error: null });
        
        try {
          const searchParams = new URLSearchParams();
          
          if (completed !== undefined) searchParams.append('completed', completed.toString());
          
          const queryString = searchParams.toString();
          const url = `/api/households/${householdId}/shopping${queryString ? `?${queryString}` : ''}`;
          
          const response = await apiService.get(url);
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

      createShoppingItem: async (householdId: string, itemData: CreateShoppingItemRequest) => {
        set({ error: null });
        
        try {
          const response = await apiService.post(`/api/households/${householdId}/shopping`, itemData);
          const result = await response.json();
          
          if (result.success && result.data) {
            const newItem = result.data;
            set(state => ({ 
              items: [...state.items, newItem] 
            }));
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

      updateShoppingItem: async (householdId: string, id: string, updates: UpdateShoppingItemRequest) => {
        set({ error: null });
        
        try {
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

      deleteShoppingItem: async (householdId: string, id: string) => {
        set({ error: null });
        
        try {
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

      toggleShoppingItemCompleted: async (householdId: string, id: string) => {
        set({ error: null });
        
        try {
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

      bulkUpdateCompleted: async (householdId: string, ids: string[], completed: boolean) => {
        set({ error: null });
        
        try {
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

      clearCompleted: async (householdId: string) => {
        set({ error: null });
        
        try {
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

      reorderItems: async (householdId: string, itemPriorities: Array<{ id: string; priority: number }>) => {
        set({ error: null });
        
        try {
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
    }),
    {
      name: 'shopping-store',
    }
  )
); 