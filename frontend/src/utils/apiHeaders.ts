/**
 * Utility functions for managing API headers consistently across the application
 */

/**
 * Gets the common headers for all API requests
 */
export const getCommonHeaders = (): Record<string, string> => {
  return {
    'Content-Type': 'application/json',
  };
};

/**
 * Gets headers for authenticated API requests
 * Token parameter is required for security
 */
export const getAuthHeaders = (token: string): Record<string, string> => {
  return {
    ...getCommonHeaders(),
    'Authorization': `Bearer ${token}`,
  };
};

/**
 * Gets headers for authenticated API requests with automatic token retrieval and refresh
 * Uses only OAuth2 tokens from the auth store and handles token refresh automatically
 */
export const getAuthHeadersAuto = async (): Promise<Record<string, string>> => {
  let authToken: string | undefined;
  
  try {
    // Get token from auth store (OAuth2 flow only)
    const { useAuthStore } = await import('../stores/authStore');
    const store = useAuthStore.getState();
    
    // Check if we have a valid access token
    authToken = await store.getValidAccessToken();
    
    if (!authToken) {
      console.error("Authentication required. Please log in to continue.");
      // Sign out the user and redirect to auth page
      store.signOut();
      
      // Use window.location for navigation since this is a utility function
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
    }
  } catch (error) {
    console.warn('Could not get token from auth store:', error);
  }
  
  return {
    ...getCommonHeaders(),
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
  };
};

/**
 * Gets headers for unauthenticated API requests (like auth endpoints)
 */
export const getUnauthHeaders = (): Record<string, string> => {
  return getCommonHeaders();
};

/**
 * Merges custom headers with the default headers (sync version - no auto-refresh)
 */
export const mergeHeaders = (customHeaders: HeadersInit = {}, authenticated: boolean = true, token?: string): Record<string, string> => {
  let baseHeaders: Record<string, string>;
  
  if (authenticated) {
    if (token) {
      // Token explicitly provided (e.g., from useApiWithAuth hook)
      baseHeaders = getAuthHeaders(token);
    } else {
      // No token provided, get current token from store (no auto-refresh in sync version)
      // For sync version, just return unauth headers when no token provided
      // Caller should provide token explicitly or use async version
      console.warn('No token provided to sync mergeHeaders, returning unauth headers');
      baseHeaders = getUnauthHeaders();
    }
  } else {
    baseHeaders = getUnauthHeaders();
  }
  
  // Convert HeadersInit to Record<string, string>
  let processedCustomHeaders: Record<string, string> = {};
  
  if (customHeaders instanceof Headers) {
    customHeaders.forEach((value, key) => {
      processedCustomHeaders[key] = value;
    });
  } else if (Array.isArray(customHeaders)) {
    customHeaders.forEach(([key, value]) => {
      processedCustomHeaders[key] = value;
    });
  } else if (customHeaders) {
    processedCustomHeaders = customHeaders as Record<string, string>;
  }
  
  return {
    ...baseHeaders,
    ...processedCustomHeaders,
  };
}; 