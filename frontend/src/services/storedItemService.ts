import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { Unit } from '@/types/enums';

export interface StoredItem {
  id: string;
  itemId: string;
  storageAreaId: string;
  quantity: number;
  unit: Unit;
  expirationDate: string | null | undefined;
  location: string | null;
  isOpened: boolean;
  openedDate: string | null | undefined;
  householdId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  item?: {
    id: string;
    name: string;
    category: string;
    defaultUnit: string;
    availableUnits: string[];
    daysAfterOpening?: number;
    createdBy: string | null;
    householdId: string | null;
    imageUrl: string | null;
    createdAt: string;
    updatedAt: string;
  };
  storageArea?: {
    id: string;
    name: string;
    emoji: string;
    type: string;
  };
  creator?: {
    id: string;
    displayName: string;
    email: string;
  };
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  daysUntilExpiration?: number | null;
  effectiveExpirationDate?: string | null;
}

export interface CreateStoredItemRequest {
  itemId: string;
  storageAreaId: string;
  quantity: number;
  unit: Unit;
  expirationDate?: string;
  location?: string;
  isOpened?: boolean;
  openedDate?: string;
}

export interface UpdateStoredItemRequest {
  quantity?: number;
  unit?: Unit;
  expirationDate?: string;
  location?: string;
  isOpened?: boolean;
  openedDate?: string;
}

export interface GetStoredItemsRequest {
  storageAreaId?: string;
  itemId?: string;
  search?: string;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  limit?: number;
  offset?: number;
}

export interface StoredItemsResponse {
  items: StoredItem[];
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

// Stored item service methods
const getStoredItems = async (householdId: string, params?: GetStoredItemsRequest): Promise<StoredItemsResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params?.storageAreaId) searchParams.append('storageAreaId', params.storageAreaId);
  if (params?.itemId) searchParams.append('itemId', params.itemId);
  if (params?.search) searchParams.append('search', params.search);
  if (params?.isExpired !== undefined) searchParams.append('isExpired', params.isExpired.toString());
  if (params?.isExpiringSoon !== undefined) searchParams.append('isExpiringSoon', params.isExpiringSoon.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset) searchParams.append('offset', params.offset.toString());

  const response = await apiService.get(`/api/households/${householdId}/stored-items?${searchParams.toString()}`);
  const result: ApiResponse<StoredItemsResponse> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch stored items');
  }
  
  return result.data || { items: [], total: 0 };
};

const getStoredItemById = async (householdId: string, id: string): Promise<StoredItem> => {
  const response = await apiService.get(`/api/households/${householdId}/stored-items/${id}`);
  const result: ApiResponse<StoredItem> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch stored item');
  }
  
  return result.data!;
};

const createStoredItem = async (householdId: string, itemData: CreateStoredItemRequest): Promise<StoredItem> => {
  const response = await apiService.post(`/api/households/${householdId}/stored-items`, itemData);
  const result: ApiResponse<StoredItem> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create stored item');
  }
  
  return result.data!;
};

const updateStoredItem = async (householdId: string, id: string, updates: UpdateStoredItemRequest): Promise<StoredItem> => {
  const response = await apiService.put(`/api/households/${householdId}/stored-items/${id}`, updates);
  const result: ApiResponse<StoredItem> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update stored item');
  }
  
  return result.data!;
};

const deleteStoredItem = async (householdId: string, id: string): Promise<void> => {
  const response = await apiService.delete(`/api/households/${householdId}/stored-items/${id}`);
  const result: ApiResponse<void> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete stored item');
  }
};

const getStoredItemsByStorageArea = async (householdId: string, storageAreaId: string): Promise<StoredItem[]> => {
  const response = await apiService.get(`/api/households/${householdId}/storage-areas/${storageAreaId}/stored-items`);
  const result: ApiResponse<StoredItem[]> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch stored items by storage area');
  }
  
  return result.data || [];
};

const getExpiringItems = async (householdId: string, days?: number): Promise<StoredItem[]> => {
  const searchParams = new URLSearchParams();
  if (days) searchParams.append('days', days.toString());

  const response = await apiService.get(`/api/households/${householdId}/stored-items/expiring?${searchParams.toString()}`);
  const result: ApiResponse<StoredItem[]> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch expiring items');
  }
  
  return result.data || [];
};

const getExpiredItems = async (householdId: string): Promise<StoredItem[]> => {
  const response = await apiService.get(`/api/households/${householdId}/stored-items/expired`);
  const result: ApiResponse<StoredItem[]> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch expired items');
  }
  
  return result.data || [];
};

const getTotalQuantityByItem = async (householdId: string, itemId: string): Promise<number> => {
  const response = await apiService.get(`/api/households/${householdId}/items/${itemId}/total-quantity`);
  const result: ApiResponse<{ totalQuantity: number }> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch total quantity');
  }
  
  return result.data?.totalQuantity || 0;
};

// Export the service methods directly
export const storedItemService = {
  getStoredItems,
  getStoredItemById,
  createStoredItem,
  updateStoredItem,
  deleteStoredItem,
  getStoredItemsByStorageArea,
  getExpiringItems,
  getExpiredItems,
  getTotalQuantityByItem,
};

// Hook that returns the service methods (for backward compatibility)
export const useStoredItemService = () => {
  return storedItemService;
}; 