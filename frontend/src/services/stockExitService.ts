import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { StockExitType, Unit } from '@/types/enums';
import type { StoredItem } from '@/services/storedItemService';

// Log row returned by the backend when an item leaves the stock.
export interface StockExitDto {
  id: string;
  householdId: string;
  storedItemId: string | null;
  itemId: string | null;
  exitType: StockExitType;
  quantity: number;
  unit: Unit;
  exitedBy: string;
  exitedByName?: string | null;
  itemName: string;
  category?: string | null;
  storageAreaId?: string | null;
  storageAreaName?: string | null;
  expirationDate?: string | null;
  createdAt: string;
}

export interface ExitStoredItemRequest {
  type: StockExitType;
  quantity?: number;
}

export interface ExitStoredItemResponse {
  exit: StockExitDto;
  remaining: StoredItem | null;
}

export interface UndoExitResponse {
  restored: StoredItem;
}

export interface ListExitsOptions {
  limit?: number;
  offset?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Non-hook API service for use in stores and non-React contexts.
const createApiService = () => {
  const makeApiCall = async (
    url: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      headers?: Record<string, string>;
    } = {}
  ) => {
    const response = await makeAuthenticatedApiCall(url, options, {
      showToast: false, // Let individual services handle their own error messaging
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
    post: (url: string, body?: unknown, headers?: Record<string, string>) =>
      makeApiCall(url, { method: 'POST', body, headers }),
    put: (url: string, body?: unknown, headers?: Record<string, string>) =>
      makeApiCall(url, { method: 'PUT', body, headers }),
    delete: (url: string, headers?: Record<string, string>) =>
      makeApiCall(url, { method: 'DELETE', headers }),
  };
};

const apiService = createApiService();

const exitStoredItem = async (
  householdId: string,
  storedItemId: string,
  payload: ExitStoredItemRequest
): Promise<ExitStoredItemResponse> => {
  const response = await apiService.post(
    `/api/households/${householdId}/stored-items/${storedItemId}/exit`,
    payload
  );
  const result: ApiResponse<ExitStoredItemResponse> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to exit stored item');
  }

  return result.data!;
};

const undoExit = async (householdId: string, exitId: string): Promise<UndoExitResponse> => {
  const response = await apiService.post(
    `/api/households/${householdId}/stock-exits/${exitId}/undo`
  );
  const result: ApiResponse<UndoExitResponse> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to undo exit');
  }

  return result.data!;
};

const listExits = async (
  householdId: string,
  opts?: ListExitsOptions
): Promise<StockExitDto[]> => {
  const searchParams = new URLSearchParams();
  if (opts?.limit !== undefined) searchParams.append('limit', opts.limit.toString());
  if (opts?.offset !== undefined) searchParams.append('offset', opts.offset.toString());

  const query = searchParams.toString();
  const response = await apiService.get(
    `/api/households/${householdId}/stock-exits${query ? `?${query}` : ''}`
  );
  const result: ApiResponse<StockExitDto[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch stock exits');
  }

  return result.data || [];
};

export const stockExitService = {
  exitStoredItem,
  undoExit,
  listExits,
};

// Hook that returns the service methods (for backward compatibility with hook-style usage).
export const useStockExitService = () => stockExitService;
