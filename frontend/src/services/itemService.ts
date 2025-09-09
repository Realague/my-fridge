import { useApiWithAuth } from '@/hooks/useApiWithAuth';

export interface Item {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  availableUnits: string[];
  createdBy: string | null;
  householdId: string | null;
  createdAt: string;
  updatedAt: string;
  //scope: string;
  //commonQuantities: string[];
  //usageCount: number;
}

export interface CreateItemRequest {
  name: string;
  category: string;
  defaultUnit?: string;
  availableUnits?: string[];
  householdId: string;
}

export interface UpdateItemRequest {
  name?: string;
  category?: string;
  defaultUnit?: string;
  availableUnits?: string[];
}

export interface SearchItemsRequest {
  search: string;
  limit?: number;
  offset?: number;
}

export interface SearchItemsResponse {
  items: Item[];
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
    throw new Error('API instance not initialized. Make sure to call initializeItemService.');
  }
  return apiInstance;
};

export const initializeItemService = (api: ReturnType<typeof useApiWithAuth>) => {
  apiInstance = api;
};

// Item service methods - these will be available globally after initialization
const searchItems = async (params: SearchItemsRequest): Promise<SearchItemsResponse> => {
  const { get } = getApi();
  const searchParams = new URLSearchParams();
  
  searchParams.append('search', params.search);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());

  const response = await get(`/api/items/search?${searchParams.toString()}`);
  const result: ApiResponse<SearchItemsResponse> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to search items');
  }
  
  return result.data || { items: [], total: 0 };
};

const getItemById = async (id: string, householdId?: string): Promise<Item> => {
  const { get } = getApi();
  const searchParams = new URLSearchParams();
  if (householdId) searchParams.append('householdId', householdId);

  const response = await get(`/api/items/${id}?${searchParams.toString()}`);
  const result: ApiResponse<Item> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch item');
  }
  
  return result.data!;
};

const createItem = async (itemData: CreateItemRequest): Promise<Item> => {
  const { post } = getApi();
  const response = await post('/api/items', itemData);
  const result: ApiResponse<Item> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create item');
  }
  
  return result.data!;
};

const updateItem = async (id: string, updates: UpdateItemRequest, householdId?: string): Promise<Item> => {
  const { put } = getApi();
  const searchParams = new URLSearchParams();
  if (householdId) searchParams.append('householdId', householdId);

  const response = await put(`/api/items/${id}?${searchParams.toString()}`, updates);
  const result: ApiResponse<Item> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update item');
  }
  
  return result.data!;
};

const deleteItem = async (id: string, householdId?: string): Promise<void> => {
  const { delete: del } = getApi();
  const searchParams = new URLSearchParams();
  if (householdId) searchParams.append('householdId', householdId);

  const response = await del(`/api/items/${id}?${searchParams.toString()}`);
  const result: ApiResponse<void> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete item');
  }
};

const getItemsByHousehold = async (householdId: string): Promise<Item[]> => {
  const { get } = getApi();
  const response = await get(`/api/items/household/${householdId}`);
  const result: ApiResponse<Item[]> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch household items');
  }
  
  return result.data || [];
};

const getItemsByCategory = async (category: string, householdId?: string): Promise<Item[]> => {
  const { get } = getApi();
  const searchParams = new URLSearchParams();
  if (householdId) searchParams.append('householdId', householdId);

  const response = await get(`/api/items/category/${category}?${searchParams.toString()}`);
  const result: ApiResponse<Item[]> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch items by category');
  }
  
  return result.data || [];
};

// Export the service methods directly
export const itemService = {
  searchItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getItemsByHousehold,
  getItemsByCategory,
};

// Hook that returns the service methods (for backward compatibility)
export const useItemService = () => {
  return itemService;
}; 