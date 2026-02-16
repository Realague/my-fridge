/**
 * Core authenticated API call utility - consolidated authentication logic
 * Used by both React hooks and stores/services
 */

import { getAuthHeaders, getCommonHeaders, getApiBaseUrl } from '@/utils/apiHeaders';
import { toast } from "sonner";
import i18n from '@/i18n/config';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

interface AuthCallbacks {
  onAuthError?: () => void;
  showToast?: boolean;
}

/**
 * Core authenticated API call function
 */
export const makeAuthenticatedApiCall = async (
  url: string, 
  options: ApiOptions = {}, 
  callbacks: AuthCallbacks = {}
): Promise<Response> => {
  const baseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  const timeout = options.timeout || 10000;
  const { onAuthError, showToast = true } = callbacks;

  // Get auth store
  const { useAuthStore } = await import('../stores/authStore');
  const { getValidAccessToken, refreshTokens, signOut } = useAuthStore.getState();
  
  const token = await getValidAccessToken();
  if (!token) {
    if (showToast) {
      toast.error(i18n.t('messages.error.authenticationRequired'));
    }
    signOut();
    if (onAuthError) {
      onAuthError();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/auth';
    }
    throw new Error('No valid authentication token');
  }

  // Setup request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestOptions: RequestInit = {
    method: options.method || 'GET',
    headers: {
      ...getCommonHeaders(),
      ...getAuthHeaders(token),
      ...options.headers,
    },
    signal: controller.signal,
    ...(options.body && { body: JSON.stringify(options.body) }),
  };

  try {
    const response = await fetch(fullUrl, requestOptions);
    clearTimeout(timeoutId);

    // Handle 401 - try refresh once
    if (response.status === 401) {
      const refreshSuccess = await refreshTokens();
      
      if (refreshSuccess) {
        const newToken = await getValidAccessToken();
        if (newToken) {
          // Retry with new token
          const retryResponse = await fetch(fullUrl, {
            ...requestOptions,
            headers: {
              ...getCommonHeaders(),
              ...getAuthHeaders(newToken),
              ...options.headers,
            },
          });
          
          if (retryResponse.status === 401) {
            throw new Error('Authentication failed after token refresh');
          }
          return retryResponse;
        }
      }
      throw new Error('Token refresh failed');
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout / 1000} seconds`);
      if (showToast) toast.error(i18n.t('messages.error.requestTimeout'));
      throw timeoutError;
    }
    
    // Handle auth errors
    if (error instanceof Error && 
        (error.message.includes('Authentication') || 
         error.message.includes('Token') ||
         error.message.includes('401'))) {
      
      if (showToast) toast.error(i18n.t('messages.error.sessionExpired'));
      signOut();
      if (onAuthError) {
        onAuthError();
      } else if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
    }
    
    throw error;
  }
};
