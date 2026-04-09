import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { StorageAreaType } from '@/types/enums';

export interface StorageArea {
  id: string;
  name: string;
  emoji: string;
  type: StorageAreaType;
  defaultCategories: string[];
  sortOrder: number;
  householdId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStorageAreaData {
  name: string;
  emoji?: string;
  type?: StorageAreaType;
  defaultCategories?: string[];
}

export interface UpdateStorageAreaData {
  name?: string;
  emoji?: string;
  type?: StorageAreaType;
  defaultCategories?: string[];
}

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Non-hook version for use in stores
export const createStorageAreaApiService = () => {
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
      body: data,
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
      body: data,
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

  const reorderStorageAreas = async (householdId: string, items: Array<{ id: string; sortOrder: number }>): Promise<StorageArea[]> => {
    const response = await makeApiCall(`/api/households/${householdId}/storage-areas/reorder`, {
      method: 'PUT',
      body: { items },
    });

    const result: ApiResponse<StorageArea[]> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to reorder storage areas');
    }

    return result.data;
  };

  return {
    getStorageAreas,
    createStorageArea,
    updateStorageArea,
    deleteStorageArea,
    reorderStorageAreas,
  };
};

// Default export for module
export default createStorageAreaApiService;
