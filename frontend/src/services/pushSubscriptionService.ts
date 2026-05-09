import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { SerializedPushSubscription } from '@/utils/pushSubscription';

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
  return (result.data as T) ?? (null as T);
};

export const pushSubscriptionService = {
  getVapidPublicKey: async (): Promise<string> => {
    const data = await call<{ publicKey: string }>(`/api/push/vapid-public-key`);
    return data?.publicKey ?? '';
  },

  registerSubscription: (subscription: SerializedPushSubscription, userAgent?: string) =>
    call<null>(`/api/push/subscriptions`, {
      method: 'POST',
      body: { ...subscription, userAgent },
    }),

  unregisterSubscription: (endpoint: string) =>
    call<null>(`/api/push/subscriptions`, {
      method: 'DELETE',
      body: { endpoint },
    }),
};
