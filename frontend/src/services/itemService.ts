import { makeAuthenticatedApiCall } from '@/utils/apiAuth';

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

// Create API service that doesn't require React context
const createApiService = () => {
  const makeApiCall = async (url: string, options: RequestInit = {}) => {
    const body = options.body ? JSON.parse(options.body as string) : undefined;
    const response = await makeAuthenticatedApiCall(url, {
      method: options.method as any,
      body,
      headers: options.headers as Record<string, string>
    });

    return response;
  };

  return {
    get: (url: string) => makeApiCall(url, { method: 'GET' }),
    post: (url: string, body?: any) => makeApiCall(url, { 
      method: 'POST', 
      body: body ? JSON.stringify(body) : undefined 
    }),
    put: (url: string, body?: any) => makeApiCall(url, { 
      method: 'PUT', 
      body: body ? JSON.stringify(body) : undefined 
    }),
    delete: (url: string) => makeApiCall(url, { method: 'DELETE' }),
  };
};

const apiService = createApiService();

// Item service methods
const searchItems = async (params: SearchItemsRequest): Promise<SearchItemsResponse> => {
  const searchParams = new URLSearchParams();
  
  searchParams.append('search', params.search);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());

  const response = await apiService.get(`/api/items/search?${searchParams.toString()}`);
  const result: ApiResponse<SearchItemsResponse> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to search items');
  }
  
  return result.data || { items: [], total: 0 };
};

const getItemById = async (id: string, householdId?: string): Promise<Item> => {
  const searchParams = new URLSearchParams();
  if (householdId) searchParams.append('householdId', householdId);

  const response = await apiService.get(`/api/items/${id}?${searchParams.toString()}`);
  const result: ApiResponse<Item> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch item');
  }
  
  return result.data!;
};

const createItem = async (itemData: CreateItemRequest): Promise<Item> => {
  const response = await apiService.post('/api/items', itemData);
  const result: ApiResponse<Item> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to create item');
  }
  
  return result.data!;
};

const updateItem = async (id: string, updates: UpdateItemRequest, householdId?: string): Promise<Item> => {
  const searchParams = new URLSearchParams();
  if (householdId) searchParams.append('householdId', householdId);

  const response = await apiService.put(`/api/items/${id}?${searchParams.toString()}`, updates);
  const result: ApiResponse<Item> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update item');
  }
  
  return result.data!;
};

const deleteItem = async (id: string, householdId?: string): Promise<void> => {
  const searchParams = new URLSearchParams();
  if (householdId) searchParams.append('householdId', householdId);

  const response = await apiService.delete(`/api/items/${id}?${searchParams.toString()}`);
  const result: ApiResponse<void> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete item');
  }
};

const getItemsByHousehold = async (householdId: string): Promise<Item[]> => {
  const response = await apiService.get(`/api/items/household/${householdId}`);
  const result: ApiResponse<Item[]> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch household items');
  }
  
  return result.data || [];
};

const getItemsByCategory = async (category: string, householdId?: string): Promise<Item[]> => {
  const searchParams = new URLSearchParams();
  if (householdId) searchParams.append('householdId', householdId);

  const response = await apiService.get(`/api/items/category/${category}?${searchParams.toString()}`);
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