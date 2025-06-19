import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

export const useApiWithAuth = () => {
  const { checkTokenExpiry, refreshToken, signOut } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const makeApiCall = async (url: string, options: ApiOptions = {}) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    // Check if token is expired before making the call
    if (checkTokenExpiry()) {
      console.log('Token expired, attempting refresh...');
      
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

    // Prepare the request
    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    };

    if (options.body) {
      requestOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(fullUrl, requestOptions);

      // Handle 401 Unauthorized responses
      if (response.status === 401) {
        console.log('Received 401, token may be expired. Attempting refresh...');
        
        // Try to refresh token
        const refreshSuccess = await refreshToken();
        
        if (refreshSuccess) {
          // Retry the original request with new token
          const newToken = localStorage.getItem('google_token');
          const retryOptions = {
            ...requestOptions,
            headers: {
              ...requestOptions.headers,
              'Authorization': `Bearer ${newToken}`,
            },
          };
          
          const retryResponse = await fetch(fullUrl, retryOptions);
          
          if (retryResponse.status === 401) {
            // Still unauthorized after refresh, force logout
            throw new Error('Authentication failed after token refresh');
          }
          
          return retryResponse;
        } else {
          // Refresh failed, force logout
          throw new Error('Token refresh failed');
        }
      }

      return response;
    } catch (error) {
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

  // Convenience methods
  const get = (url: string, headers?: Record<string, string>) => 
    makeApiCall(url, { method: 'GET', headers });

  const post = (url: string, body?: any, headers?: Record<string, string>) => 
    makeApiCall(url, { method: 'POST', body, headers });

  const put = (url: string, body?: any, headers?: Record<string, string>) => 
    makeApiCall(url, { method: 'PUT', body, headers });

  const del = (url: string, headers?: Record<string, string>) => 
    makeApiCall(url, { method: 'DELETE', headers });

  return {
    makeApiCall,
    get,
    post,
    put,
    delete: del,
  };
}; 