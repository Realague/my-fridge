import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { Unit } from '@/types/enums';

export interface ItemMinimum {
  id: string;
  itemId: string;
  householdId: string;
  minimumQuantity: number;
  minimumUnit: Unit;
  shoppingQuantity: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
  creator?: {
    id: string;
    displayName: string;
    email: string;
  };
  household?: {
    id: string;
    name: string;
  };
}

export interface CreateItemMinimumRequest {
  itemId: string;
  minimumQuantity: number;
  minimumUnit: Unit;
  shoppingQuantity: number;
}

export interface UpdateItemMinimumRequest {
  minimumQuantity?: number;
  minimumUnit?: Unit;
  shoppingQuantity?: number;
}

export interface LowStockItem {
  itemMinimum: ItemMinimum;
  currentQuantity: number;
  currentUnit: Unit;
  quantityNeeded: number;
  isLowStock: boolean;
}

export interface ItemMinimumsResponse {
  itemMinimums: ItemMinimum[];
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Non-hook API service for use in stores and non-React contexts
const createApiService = () => {
  const makeApiCall = async (url: string, options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: any; headers?: Record<string, string>; } = {}) => {
    const response = await makeAuthenticatedApiCall(url, options, {
      showToast: false // Let individual services handle their own error messaging
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
    delete: (url: string, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'DELETE', headers }),
  };
};

const apiService = createApiService();

// Item minimum service methods
const getItemMinimums = async (householdId: string): Promise<ItemMinimumsResponse> => {
  const response = await apiService.get(`/api/households/${householdId}/item-minimums`);
  const result: ApiResponse<ItemMinimumsResponse> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch item minimums');
  }
  
  return result.data || { itemMinimums: [], total: 0 };
};

const getItemMinimumById = async (householdId: string, id: string): Promise<ItemMinimum> => {
  const response = await apiService.get(`/api/households/${householdId}/item-minimums/${id}`);
  const result: ApiResponse<ItemMinimum> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch item minimum');
  }
  
  return result.data!;
};

const createItemMinimum = async (householdId: string, data: CreateItemMinimumRequest): Promise<ItemMinimum> => {
  const response = await apiService.post(`/api/households/${householdId}/item-minimums`, data);
  const result: ApiResponse<ItemMinimum> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create item minimum');
  }
  
  return result.data!;
};

const updateItemMinimum = async (householdId: string, id: string, updates: UpdateItemMinimumRequest): Promise<ItemMinimum> => {
  const response = await apiService.put(`/api/households/${householdId}/item-minimums/${id}`, updates);
  const result: ApiResponse<ItemMinimum> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update item minimum');
  }
  
  return result.data!;
};

const deleteItemMinimum = async (householdId: string, id: string): Promise<void> => {
  const response = await apiService.delete(`/api/households/${householdId}/item-minimums/${id}`);
  const result: ApiResponse<void> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete item minimum');
  }
};

const getLowStockItems = async (householdId: string): Promise<LowStockItem[]> => {
  const response = await apiService.get(`/api/households/${householdId}/item-minimums/low-stock`);
  const result: ApiResponse<LowStockItem[]> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch low stock items');
  }
  
  return result.data || [];
};

// Export the service methods directly
export const itemMinimumService = {
  getItemMinimums,
  getItemMinimumById,
  createItemMinimum,
  updateItemMinimum,
  deleteItemMinimum,
  getLowStockItems,
};

// Hook that returns the service methods (for backward compatibility)
export const useItemMinimumService = () => {
  return itemMinimumService;
};
