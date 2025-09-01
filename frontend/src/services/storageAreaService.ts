import { mergeHeaders } from '@/utils/apiHeaders';

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
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    const token = localStorage.getItem('google_token');
    if (!token) {
      throw new Error('No authentication token');
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: mergeHeaders(options.headers, true, token),
    };

    const response = await fetch(fullUrl, requestOptions);
    
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
