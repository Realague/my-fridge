import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { makeAuthenticatedApiCall } from '@/utils/apiAuth';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export const useApiWithAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const makeApiCall = async (url: string, options: ApiOptions = {}) => {
    return makeAuthenticatedApiCall(url, options, {
      onAuthError: () => navigate('/auth'),
      showToast: false, // We'll handle toasts ourselves for better UX
    }).catch((error) => {
      // Handle React-specific toast notifications
      if (error.message.includes('timeout')) {
        toast({
          title: t("messages.error.requestTimeout"),
          description: t("messages.error.requestTimeout"),
          variant: "destructive",
        });
      } else if (error.message.includes('Authentication') || 
                 error.message.includes('Token')) {
        toast({
          title: t("messages.error.sessionExpired"),
          description: t("messages.error.sessionExpired"),
          variant: "destructive",
        });
      }
      throw error;
    });
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