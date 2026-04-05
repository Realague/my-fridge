import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { BarcodeFormat } from '@/types/enums';

export interface LoyaltyCard {
  id: string;
  householdId: string;
  storeSlug: string | null;
  storeName: string;
  cardNumber: string;
  barcodeData: string | null;
  barcodeFormat: BarcodeFormat | null;
  notes: string | null;
  color: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    email: string;
  };
  household?: {
    id: string;
    name: string;
  };
}

export interface CreateLoyaltyCardRequest {
  storeSlug?: string;
  storeName: string;
  cardNumber: string;
  barcodeData?: string;
  barcodeFormat?: BarcodeFormat;
  notes?: string;
  color?: string;
}

export interface UpdateLoyaltyCardRequest {
  storeSlug?: string;
  storeName?: string;
  cardNumber?: string;
  barcodeData?: string;
  barcodeFormat?: BarcodeFormat;
  notes?: string;
  color?: string;
}

export interface LoyaltyCardsResponse {
  loyaltyCards: LoyaltyCard[];
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const createApiService = () => {
  const makeApiCall = async (url: string, options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: any; headers?: Record<string, string>; } = {}) => {
    const response = await makeAuthenticatedApiCall(url, options, {
      showToast: false
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

const getLoyaltyCards = async (householdId: string): Promise<LoyaltyCardsResponse> => {
  const response = await apiService.get(`/api/households/${householdId}/loyalty-cards`);
  const result: ApiResponse<LoyaltyCardsResponse> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch loyalty cards');
  }

  return result.data || { loyaltyCards: [], total: 0 };
};

const getLoyaltyCardById = async (householdId: string, id: string): Promise<LoyaltyCard> => {
  const response = await apiService.get(`/api/households/${householdId}/loyalty-cards/${id}`);
  const result: ApiResponse<LoyaltyCard> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch loyalty card');
  }

  return result.data!;
};

const createLoyaltyCard = async (householdId: string, data: CreateLoyaltyCardRequest): Promise<LoyaltyCard> => {
  const response = await apiService.post(`/api/households/${householdId}/loyalty-cards`, data);
  const result: ApiResponse<LoyaltyCard> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to create loyalty card');
  }

  return result.data!;
};

const updateLoyaltyCard = async (householdId: string, id: string, updates: UpdateLoyaltyCardRequest): Promise<LoyaltyCard> => {
  const response = await apiService.put(`/api/households/${householdId}/loyalty-cards/${id}`, updates);
  const result: ApiResponse<LoyaltyCard> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to update loyalty card');
  }

  return result.data!;
};

const deleteLoyaltyCard = async (householdId: string, id: string): Promise<void> => {
  const response = await apiService.delete(`/api/households/${householdId}/loyalty-cards/${id}`);
  const result: ApiResponse<void> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete loyalty card');
  }
};

export const loyaltyCardService = {
  getLoyaltyCards,
  getLoyaltyCardById,
  createLoyaltyCard,
  updateLoyaltyCard,
  deleteLoyaltyCard,
};
