/**
 * Utility functions for managing API headers and URLs consistently across the application
 */

/**
 * Gets the base URL for API requests
 * VITE_API_URL should be the full API URL (e.g., https://example.com/api)
 */
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

/**
 * Gets the public URL of the frontend application (used for invite links, etc.).
 * VITE_APP_URL should be set per environment (e.g. https://app.example.com, http://localhost:5173).
 * Falls back to window.location.origin when not set (e.g. in dev).
 */
export const getAppUrl = (): string => {
  if (typeof import.meta.env.VITE_APP_URL === 'string' && import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
};

/**
 * Gets the base URL for auth requests (without /api suffix)
 * Auth routes are mounted at /auth, not /api/auth
 */
export const getAuthBaseUrl = (): string => {
  const apiUrl = getApiBaseUrl();
  // Remove /api suffix if present to get base URL for auth routes
  return apiUrl.replace(/\/api\/?$/, '');
};

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
 */
export const getAuthHeaders = (token: string): Record<string, string> => {
  return {
    'Authorization': `Bearer ${token}`,
  };
};


/**
 * Gets headers for unauthenticated API requests (like auth endpoints)
 */
export const getUnauthHeaders = (): Record<string, string> => {
  return getCommonHeaders();
};
