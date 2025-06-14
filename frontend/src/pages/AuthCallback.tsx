import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuthStatus } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const error = searchParams.get('error');
      const success = searchParams.get('success');

      if (error) {
        console.error('Authentication error:', error);
        navigate('/auth?error=' + error);
        return;
      }

      if (success) {
        // The backend OAuth flow completed successfully
        // Now we need to get the Google token from the current session
        // This would typically involve Google's JavaScript API
        
        // For now, redirect to a page where user can complete the auth
        navigate('/auth/complete');
        return;
      }

      // No specific parameters, redirect to auth
      navigate('/auth');
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-orange-50 to-green-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback; 