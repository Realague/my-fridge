import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { HouseholdSettings } from '@/types/expirationNotification';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const call = async <T>(
  url: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {}
): Promise<T> => {
  const response = await makeAuthenticatedApiCall(url, options, { showToast: false });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(err.message || `HTTP ${response.status}`);
  }
  const result = (await response.json()) as ApiResponse<T>;
  if (!result.success) {
    throw new Error(result.error || 'Request failed');
  }
  return result.data as T;
};

export const householdSettingsService = {
  get: (householdId: string) =>
    call<HouseholdSettings>(`/api/households/${householdId}/settings`),

  update: (
    householdId: string,
    dto: { expirationAlertDays?: number; exitSuggestionsEnabled?: boolean }
  ) =>
    call<HouseholdSettings>(`/api/households/${householdId}/settings`, {
      method: 'PUT',
      body: dto,
    }),
};
