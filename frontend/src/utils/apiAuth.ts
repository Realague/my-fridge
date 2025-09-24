/**
 * Shared authentication logic extracted from useApiWithAuth
 * This contains the exact same logic but without React hooks for use in stores/services
 */

import { mergeHeaders } from '@/utils/apiHeaders';
import { toast } from "sonner";

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Core authenticated API call - extracted from useApiWithAuth for stores/services
 * This mirrors the exact same authentication logic as the hook
 */
export const makeAuthenticatedApiCall = async (url: string, options: ApiOptions = {}): Promise<Response> => {
  const baseUrl = import.meta.env.VITE_API_URL || 'localhost:3000';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  const timeout = options.timeout || 10000; // Default 10 seconds

  // Get a valid access token (will refresh if needed) - same as useApiWithAuth
  const { useAuthStore } = await import('../stores/authStore');
  const { getValidAccessToken, refreshTokens, signOut } = useAuthStore.getState();
  const token = await getValidAccessToken();
  
  if (!token) {
    toast.error("Authentication required. Please log in to continue.");
    signOut();
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
    }
    throw new Error('No valid authentication token');
  }

  // Create abort controller for timeout - same as useApiWithAuth
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  // Prepare the request - exact same logic as useApiWithAuth
  const requestOptions: RequestInit = {
    method: options.method || 'GET',
    headers: mergeHeaders(options.headers, true, token),
    signal: controller.signal,
  };

  if (options.body) {
    requestOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(fullUrl, requestOptions);
    
    // Clear timeout on successful response
    clearTimeout(timeoutId);

    // Handle 401 Unauthorized responses - exact same logic as useApiWithAuth
    if (response.status === 401) {
      // Try to refresh token
      const refreshSuccess = await refreshTokens();
      
      if (refreshSuccess) {
        // Get the new token and retry the original request
        const newToken = await getValidAccessToken();
        
        if (newToken) {
          // Create new controller for retry
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => {
            retryController.abort();
          }, timeout);
          
          const retryOptions = {
            ...requestOptions,
            headers: mergeHeaders(options.headers, true, newToken),
            signal: retryController.signal,
          };
          
          try {
            const retryResponse = await fetch(fullUrl, retryOptions);
            clearTimeout(retryTimeoutId);
            
            if (retryResponse.status === 401) {
              // Still unauthorized after refresh, force logout
              throw new Error('Authentication failed after token refresh');
            }
            
            return retryResponse;
          } catch (retryError) {
            clearTimeout(retryTimeoutId);
            if (retryError instanceof Error && retryError.name === 'AbortError') {
              throw new Error('Request timeout during retry');
            }
            throw retryError;
          }
        }
      }
      
      // Refresh failed, force logout
      throw new Error('Token refresh failed');
    }

    return response;
  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId);
    
    // Handle timeout errors - same as useApiWithAuth
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout / 1000} seconds`);
      toast.error('Request timeout. Please try again.');
      throw timeoutError;
    }
    
    // Handle authentication errors - same as useApiWithAuth
    if (error instanceof Error && 
        (error.message.includes('Authentication') || 
         error.message.includes('Token') ||
         error.message.includes('401'))) {
      
      toast.error('Session expired. Please log in again.');
      signOut();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
    }
    
    throw error;
  }
};
