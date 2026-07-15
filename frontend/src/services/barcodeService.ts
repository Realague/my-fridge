import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { Item } from '@/services/itemService';
import { BarcodeFormat } from '@/types/enums';

/**
 * Open Food Facts product normalized by the backend and ready to pre-fill the
 * "create item" form (Cas 4).
 */
export interface OffProduct {
  barcode: string;
  name: string;
  imageUrl: string | null;
  quantity: string | null;
  category: string;
  suggestedUnit: string;
}

/**
 * Result of resolving a scanned barcode for the current household.
 * Mirrors the backend `BarcodeLookupResult` discriminated union.
 */
export type BarcodeLookupResult =
  | { match: 'catalog'; item: Item; mappingId: string; validatedCount: number; confidence: number }
  | { match: 'off'; product: OffProduct }
  | { match: 'unknown'; barcode: string };

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Non-hook API service (mirrors the canonical service pattern; services never
// toast themselves — callers decide how to surface errors).
const createApiService = () => {
  const makeApiCall = async (
    url: string,
    options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; headers?: Record<string, string> } = {}
  ) => {
    const response = await makeAuthenticatedApiCall(url, options as never, { showToast: false });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response;
  };

  return {
    post: (url: string, body?: unknown, headers?: Record<string, string>) =>
      makeApiCall(url, { method: 'POST', body, headers }),
  };
};

const apiService = createApiService();

/**
 * Resolve a scanned barcode: catalog match, Open Food Facts product, or unknown.
 * Throws on network/HTTP failure (callers handle offline explicitly).
 */
const lookup = async (householdId: string, barcode: string): Promise<BarcodeLookupResult> => {
  const response = await apiService.post(`/api/households/${householdId}/barcode/lookup`, { barcode });
  const result: ApiResponse<BarcodeLookupResult> = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to resolve barcode');
  }
  return result.data;
};

/**
 * Record/reinforce the global barcode → item mapping shared across households.
 * Best-effort: a failure here must not block the main scan flow.
 */
const confirmMapping = async (
  householdId: string,
  barcode: string,
  itemId: string,
  format?: BarcodeFormat
): Promise<void> => {
  try {
    await apiService.post(`/api/households/${householdId}/barcode/confirm`, { barcode, itemId, format });
  } catch (err) {
    // Non-fatal — the item was still added to the list.
    console.warn('barcode mapping confirmation failed:', err);
  }
};

export const barcodeService = {
  lookup,
  confirmMapping,
};
