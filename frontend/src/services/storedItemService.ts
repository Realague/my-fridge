import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { Unit } from '@/types/enums';

export interface StoredItem {
  id: string;
  itemId: string;
  storageAreaId: string;
  quantity: number;
  unit: Unit;
  expirationDate: string | null | undefined;
  location: string | null;
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
    createdBy: string | null;
    householdId: string | null;
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
}

export interface CreateStoredItemRequest {
  itemId: string;
  storageAreaId: string;
  quantity: number;
  unit: Unit;
  expirationDate?: string;
  location?: string;
}

export interface UpdateStoredItemRequest {
  quantity?: number;
  unit?: Unit;
  expirationDate?: string;
  location?: string;
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

// Create API instance outside the service to avoid circular dependencies
let apiInstance: ReturnType<typeof useApiWithAuth> | null = null;

const getApi = () => {
  if (!apiInstance) {
    throw new Error('API instance not initialized. Make sure to call initializeStoredItemService.');
  }
  return apiInstance;
};

export const initializeStoredItemService = (api: ReturnType<typeof useApiWithAuth>) => {
  apiInstance = api;
};

// Stored item service methods
const getStoredItems = async (householdId: string, params?: GetStoredItemsRequest): Promise<StoredItemsResponse> => {
  const { get } = getApi();
  const searchParams = new URLSearchParams();
  
  if (params?.storageAreaId) searchParams.append('storageAreaId', params.storageAreaId);
  if (params?.itemId) searchParams.append('itemId', params.itemId);
  if (params?.search) searchParams.append('search', params.search);
  if (params?.isExpired !== undefined) searchParams.append('isExpired', params.isExpired.toString());
  if (params?.isExpiringSoon !== undefined) searchParams.append('isExpiringSoon', params.isExpiringSoon.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.offset) searchParams.append('offset', params.offset.toString());

  const response = await get(`/api/households/${householdId}/stored-items?${searchParams.toString()}`);
  const result: ApiResponse<StoredItemsResponse> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch stored items');
  }
  
  return result.data || { items: [], total: 0 };
};

const getStoredItemById = async (householdId: string, id: string): Promise<StoredItem> => {
  const { get } = getApi();
  const response = await get(`/api/households/${householdId}/stored-items/${id}`);
  const result: ApiResponse<StoredItem> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch stored item');
  }
  
  return result.data!;
};

const createStoredItem = async (householdId: string, itemData: CreateStoredItemRequest): Promise<StoredItem> => {
  const { post } = getApi();
  const response = await post(`/api/households/${householdId}/stored-items`, itemData);
  const result: ApiResponse<StoredItem> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create stored item');
  }
  
  return result.data!;
};

const updateStoredItem = async (householdId: string, id: string, updates: UpdateStoredItemRequest): Promise<StoredItem> => {
  const { put } = getApi();
  const response = await put(`/api/households/${householdId}/stored-items/${id}`, updates);
  const result: ApiResponse<StoredItem> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update stored item');
  }
  
  return result.data!;
};

const deleteStoredItem = async (householdId: string, id: string): Promise<void> => {
  const { delete: del } = getApi();
  const response = await del(`/api/households/${householdId}/stored-items/${id}`);
  const result: ApiResponse<void> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete stored item');
  }
};

const getStoredItemsByStorageArea = async (householdId: string, storageAreaId: string): Promise<StoredItem[]> => {
  const { get } = getApi();
  const response = await get(`/api/households/${householdId}/storage-areas/${storageAreaId}/stored-items`);
  const result: ApiResponse<StoredItem[]> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch stored items by storage area');
  }
  
  return result.data || [];
};

const getExpiringItems = async (householdId: string, days?: number): Promise<StoredItem[]> => {
  const { get } = getApi();
  const searchParams = new URLSearchParams();
  if (days) searchParams.append('days', days.toString());

  const response = await get(`/api/households/${householdId}/stored-items/expiring?${searchParams.toString()}`);
  const result: ApiResponse<StoredItem[]> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch expiring items');
  }
  
  return result.data || [];
};

const getExpiredItems = async (householdId: string): Promise<StoredItem[]> => {
  const { get } = getApi();
  const response = await get(`/api/households/${householdId}/stored-items/expired`);
  const result: ApiResponse<StoredItem[]> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch expired items');
  }
  
  return result.data || [];
};

const getTotalQuantityByItem = async (householdId: string, itemId: string): Promise<number> => {
  const { get } = getApi();
  const response = await get(`/api/households/${householdId}/items/${itemId}/total-quantity`);
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