import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { BrandCategory } from '@/types/enums';

export interface Brand {
  id: string;
  name: string;
  domain: string | null;
  color: string | null;
  logoPath: string | null;
  category: BrandCategory | null;
  isCurated: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomBrandRequest {
  name: string;
  domain?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const createApiService = () => {
  const makeApiCall = async (
    url: string,
    options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: any; headers?: Record<string, string> } = {}
  ) => {
    const response = await makeAuthenticatedApiCall(url, options, { showToast: false });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response;
  };

  return {
    get: (url: string) => makeApiCall(url, { method: 'GET' }),
    post: (url: string, body?: any) => makeApiCall(url, { method: 'POST', body }),
  };
};

const apiService = createApiService();

const getBrands = async (): Promise<Brand[]> => {
  const response = await apiService.get('/api/brands');
  const result: ApiResponse<Brand[]> = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch brands');
  }
  return result.data || [];
};

const createBrand = async (data: CreateCustomBrandRequest): Promise<Brand> => {
  const response = await apiService.post('/api/brands', data);
  const result: ApiResponse<Brand> = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to create brand');
  }
  return result.data!;
};

export const brandService = {
  getBrands,
  createBrand,
};
