/**
 * Utility functions for managing API headers consistently across the application
 */

/**
 * Gets the common headers for all API requests
 */
export const getCommonHeaders = (): Record<string, string> => {
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
};

/**
 * Gets headers for authenticated API requests
 */
export const getAuthHeaders = (token?: string): Record<string, string> => {
  const authToken = token || localStorage.getItem('google_token');
  
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
 * Merges custom headers with the default headers
 */
export const mergeHeaders = (customHeaders: HeadersInit = {}, authenticated: boolean = true, token?: string): Record<string, string> => {
  const baseHeaders = authenticated ? getAuthHeaders(token) : getUnauthHeaders();
  
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