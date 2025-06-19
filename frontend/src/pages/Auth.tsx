import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithGoogle, isAuthenticated, isLoading } = useAuthStore();
  const [authLoading, setAuthLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Check for error in URL
    const error = searchParams.get('error');
    if (error) {
      console.error('Authentication error:', error);
      // You could show a toast or error message here
    }
  }, [searchParams]);

  useEffect(() => {
    // Render Google Sign-In button when SDK is loaded
    const renderGoogleButton = () => {
      if (window.google && googleButtonRef.current && import.meta.env.VITE_GOOGLE_CLIENT_ID && !isLoading) {
        try {
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'signin_with',
            width: '100%',
          });
        } catch (error) {
          console.error('Error rendering Google button:', error);
        }
      }
    };

    // Check if Google SDK is already loaded
    if (window.google) {
      renderGoogleButton();
    } else {
      // Wait for SDK to load
      const checkForGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkForGoogle);
          renderGoogleButton();
        }
      }, 100);

      // Clean up interval after 10 seconds
      setTimeout(() => clearInterval(checkForGoogle), 10000);
    }
  }, [isLoading]);

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      // If successful, the useEffect above will handle navigation
    } catch (error) {
      console.error('Google auth failed:', error);
      // You could show an error message here
    } finally {
      setAuthLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
        </Button>

        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-orange-500 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">🍃</span>
            </div>
            <CardTitle className="text-2xl">Welcome to MyFridge</CardTitle>
            <CardDescription>
              Sign in to start managing your household food inventory
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Google Sign In Button - Rendered by Google SDK */}
            <div ref={googleButtonRef} className="w-full flex justify-center">
              {/* Fallback manual button if Google button doesn't render */}
              {!window.google && (
                <Button
                  onClick={handleGoogleAuth}
                  disabled={authLoading || !import.meta.env.VITE_GOOGLE_CLIENT_ID}
                  variant="outline"
                  className="w-full py-6 text-base border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  {authLoading ? (
                    <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-gray-600"></div>
                  ) : (
                    <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {authLoading ? 'Signing in...' : 'Continue with Google'}
                </Button>
              )}
            </div>

            {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <div className="text-sm text-red-600 text-center p-3 bg-red-50 rounded">
                ⚠️ Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
