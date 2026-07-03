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
  // Optional free-text context (↳). Not captured by the current exit flow — the
  // journal renders it only when present, ready for the upstream ticket to add it.
  note?: string | null;
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
  /** ISO datetime — include exits with createdAt >= from. */
  from?: string;
  /** ISO datetime — include exits with createdAt < to. */
  to?: string;
  /** Restrict to a single exit type. */
  exitType?: StockExitType;
  /** Restrict to a single household member (userId). */
  exitedBy?: string;
}

// Per-type totals over a period (drives the summary band + tab counters).
export interface StockExitStats {
  consumed: number;
  wasted: number;
  removed: number;
}

export interface StockExitStatsResult {
  current: StockExitStats;
  // Comparable previous period (e.g. previous month), or null when the caller
  // did not request a comparison (non-month periods / no previous data).
  previous: StockExitStats | null;
}

export interface StatsOptions {
  from?: string;
  to?: string;
  previousFrom?: string;
  previousTo?: string;
  exitedBy?: string;
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
  if (opts?.from) searchParams.append('from', opts.from);
  if (opts?.to) searchParams.append('to', opts.to);
  if (opts?.exitType) searchParams.append('exitType', opts.exitType);
  if (opts?.exitedBy) searchParams.append('exitedBy', opts.exitedBy);

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

const getStats = async (
  householdId: string,
  opts?: StatsOptions
): Promise<StockExitStatsResult> => {
  const searchParams = new URLSearchParams();
  if (opts?.from) searchParams.append('from', opts.from);
  if (opts?.to) searchParams.append('to', opts.to);
  if (opts?.previousFrom) searchParams.append('previousFrom', opts.previousFrom);
  if (opts?.previousTo) searchParams.append('previousTo', opts.previousTo);
  if (opts?.exitedBy) searchParams.append('exitedBy', opts.exitedBy);

  const query = searchParams.toString();
  const response = await apiService.get(
    `/api/households/${householdId}/stock-exits/stats${query ? `?${query}` : ''}`
  );
  const result: ApiResponse<StockExitStatsResult> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch stock exit stats');
  }

  return result.data ?? { current: { consumed: 0, wasted: 0, removed: 0 }, previous: null };
};

export const stockExitService = {
  exitStoredItem,
  undoExit,
  listExits,
  getStats,
};

// Hook that returns the service methods (for backward compatibility with hook-style usage).
export const useStockExitService = () => stockExitService;
