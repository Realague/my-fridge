import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import {
  ExpirationNotificationListResponse,
  ExpiringNowResponse,
} from '@/types/expirationNotification';

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

export const notificationService = {
  list: (householdId: string) =>
    call<ExpirationNotificationListResponse>(`/api/households/${householdId}/notifications`),

  markRead: (householdId: string, notificationId: string) =>
    call<null>(`/api/households/${householdId}/notifications/${notificationId}/read`, {
      method: 'POST',
    }),

  markAllRead: (householdId: string) =>
    call<null>(`/api/households/${householdId}/notifications/read-all`, { method: 'POST' }),

  delete: (householdId: string, notificationId: string) =>
    call<null>(`/api/households/${householdId}/notifications/${notificationId}`, {
      method: 'DELETE',
    }),

  clearAll: (householdId: string) =>
    call<null>(`/api/households/${householdId}/notifications`, { method: 'DELETE' }),

  expiringNow: (householdId: string) =>
    call<ExpiringNowResponse>(`/api/households/${householdId}/expiring-now`),
};
