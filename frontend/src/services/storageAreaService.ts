import { makeAuthenticatedApiCall } from '@/utils/apiAuth';

export interface StorageArea {
  id: string;
  name: string;
  emoji: string;
  type: 'fridge' | 'freezer' | 'pantry' | 'kitchen_cupboard' | 'other';
  householdId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStorageAreaData {
  name: string;
  emoji?: string;
  type?: 'fridge' | 'freezer' | 'pantry' | 'kitchen_cupboard' | 'other';
}

export interface UpdateStorageAreaData {
  name?: string;
  emoji?: string;
  type?: 'fridge' | 'freezer' | 'pantry' | 'kitchen_cupboard' | 'other';
}

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Non-hook version for use in stores
export const createStorageAreaApiService = () => {
  const makeApiCall = async (url: string, options: RequestInit = {}) => {
    const body = options.body ? JSON.parse(options.body as string) : undefined;
    const response = await makeAuthenticatedApiCall(url, {
      method: options.method as any,
      body,
      headers: options.headers as Record<string, string>
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response;
  };

  const getStorageAreas = async (householdId: string): Promise<StorageArea[]> => {
    const response = await makeApiCall(`/api/households/${householdId}/storage-areas`);
    const result: ApiResponse<StorageArea[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch storage areas');
    }
    
    return result.data || [];
  };

  const createStorageArea = async (householdId: string, data: CreateStorageAreaData): Promise<StorageArea> => {
    const response = await makeApiCall(`/api/households/${householdId}/storage-areas`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    const result: ApiResponse<StorageArea> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create storage area');
    }
    
    return result.data;
  };

  const updateStorageArea = async (householdId: string, storageAreaId: string, data: UpdateStorageAreaData): Promise<StorageArea> => {
    const response = await makeApiCall(`/api/households/${householdId}/storage-areas/${storageAreaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    const result: ApiResponse<StorageArea> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update storage area');
    }
    
    return result.data;
  };

  const deleteStorageArea = async (householdId: string, storageAreaId: string): Promise<void> => {
    const response = await makeApiCall(`/api/households/${householdId}/storage-areas/${storageAreaId}`, {
      method: 'DELETE',
    });
    
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete storage area');
    }
  };

  return {
    getStorageAreas,
    createStorageArea,
    updateStorageArea,
    deleteStorageArea,
  };
};

// Default export for module
export default createStorageAreaApiService;
