import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { mergeHeaders } from '@/utils/apiHeaders';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number; // Timeout in milliseconds
}

export const useApiWithAuth = () => {
  const { checkTokenExpiry, refreshToken, signOut } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const makeApiCall = async (url: string, options: ApiOptions = {}) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'localhost:3000';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    const timeout = options.timeout || 10000; // Default 10 seconds

    // Check if token is expired before making the call
    if (checkTokenExpiry()) {
      // Try to refresh the token
      const refreshSuccess = await refreshToken();
      
      if (!refreshSuccess) {
        // Refresh failed, redirect to login
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        signOut();
        navigate('/auth');
        throw new Error('Token expired and refresh failed');
      }
    }

    // Get the current token
    const token = localStorage.getItem('google_token');
    
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue.",
        variant: "destructive",
      });
      navigate('/auth');
      throw new Error('No authentication token');
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    // Prepare the request
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

      // Handle 401 Unauthorized responses
      if (response.status === 401) {
        // Try to refresh token
        const refreshSuccess = await refreshToken();
        
        if (refreshSuccess) {
          // Retry the original request with new token
          const newToken = localStorage.getItem('google_token');
          
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
        } else {
          // Refresh failed, force logout
          throw new Error('Token refresh failed');
        }
      }

      return response;
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      
      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${timeout / 1000} seconds`);
        toast({
          title: "Request Timeout",
          description: `The request took too long to complete. Please try again.`,
          variant: "destructive",
        });
        throw timeoutError;
      }
      
      // Handle authentication errors
      if (error instanceof Error && 
          (error.message.includes('Authentication') || 
           error.message.includes('Token') ||
           error.message.includes('401'))) {
        
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        signOut();
        navigate('/auth');
      }
      
      throw error;
    }
  };

  // Convenience methods with optional timeout parameter
  const get = (url: string, headers?: Record<string, string>, timeout?: number) => 
    makeApiCall(url, { method: 'GET', headers, timeout });

  const post = (url: string, body?: any, headers?: Record<string, string>, timeout?: number) => 
    makeApiCall(url, { method: 'POST', body, headers, timeout });

  const put = (url: string, body?: any, headers?: Record<string, string>, timeout?: number) => 
    makeApiCall(url, { method: 'PUT', body, headers, timeout });

  const patch = (url: string, body?: any, headers?: Record<string, string>, timeout?: number) => 
    makeApiCall(url, { method: 'PATCH', body, headers, timeout });

  const del = (url: string, headers?: Record<string, string>, timeout?: number) => 
    makeApiCall(url, { method: 'DELETE', headers, timeout });

  return {
    makeApiCall,
    get,
    post,
    put,
    patch,
    delete: del,
  };
}; 