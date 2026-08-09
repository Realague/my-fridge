import { makeAuthenticatedApiCall } from '@/utils/apiAuth';

export interface Item {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  availableUnits: string[];
  pieceAlias?: string | null;
  daysAfterOpening?: number;
  excludeFromShopping?: boolean;
  createdBy: string | null;
  householdId: string | null;
  imageUrl: string | null;
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
  pieceAlias?: string | null;
  daysAfterOpening?: number;
  householdId: string;
  imageUrl?: string | null;
}

export interface UpdateItemRequest {
  name?: string;
  category?: string;
  defaultUnit?: string;
  availableUnits?: string[];
  pieceAlias?: string | null;
  daysAfterOpening?: number;
  imageUrl?: string | null;
}

export interface SearchItemsRequest {
  search: string;
  language?: string;
  limit?: number;
  offset?: number;
  personalized?: boolean;
}

export interface SearchItemsResponse {
  items: Item[];
  total: number;
}

export interface RecentItem extends Item {
  lastSelectedAt: string;
}

export interface ItemSuggestions {
  recent: RecentItem[];
  personalFrequent: Item[];
  householdFrequent: Item[];
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

// Item service methods
const searchItems = async (params: SearchItemsRequest): Promise<SearchItemsResponse> => {
  const searchParams = new URLSearchParams();

  searchParams.append('search', params.search);
  if (params.language) searchParams.append('language', params.language);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());
  if (params.personalized) searchParams.append('personalized', 'true');

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

// Full catalog (global + household), alphabetical, paginated. Backed by the
// empty-search branch of GET /api/items — powers the "Tous les articles"
// section's infinite scroll.
const getCatalogPage = async (params: {
  householdId: string;
  language?: string;
  limit?: number;
  offset?: number;
}): Promise<SearchItemsResponse> => {
  const searchParams = new URLSearchParams();
  searchParams.append('householdId', params.householdId);
  if (params.language) searchParams.append('language', params.language);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());

  const response = await apiService.get(`/api/items?${searchParams.toString()}`);
  const result: ApiResponse<SearchItemsResponse> = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to load catalog');
  }
  return result.data || { items: [], total: 0 };
};

const getItemSuggestions = async (householdId: string): Promise<ItemSuggestions> => {
  const response = await apiService.get(`/api/households/${householdId}/item-suggestions`);
  const result: ApiResponse<ItemSuggestions> = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to load suggestions');
  }
  return result.data || { recent: [], personalFrequent: [], householdFrequent: [] };
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

const getRecipeCount = async (itemId: string): Promise<number> => {
  try {
    const response = await apiService.get(`/api/items/${itemId}/recipe-count`);
    const result: ApiResponse<{ count: number }> = await response.json();
    return result.data?.count ?? 0;
  } catch {
    return 0;
  }
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
  getRecipeCount,
  getCatalogPage,
  getItemSuggestions,
};

// Hook that returns the service methods (for backward compatibility)
export const useItemService = () => {
  return itemService;
}; 