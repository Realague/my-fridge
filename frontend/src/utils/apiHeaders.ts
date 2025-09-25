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
