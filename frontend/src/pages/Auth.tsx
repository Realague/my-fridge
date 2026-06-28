import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getUnauthHeaders, getAuthBaseUrl } from '@/utils/apiHeaders';
import { getAuthReturnUrl, clearAuthReturnUrl, setAuthReturnUrl } from '@/pages/JoinHousehold';

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithGoogle, isAuthenticated, isLoading, user, setUser, setTokens, setAuthenticated, setLoading } = useAuthStore();
  const [authLoading, setAuthLoading] = useState(false);

  // Persist returnUrl from query so we can redirect after OAuth (OAuth leaves the page and drops query params)
  useEffect(() => {
    const returnUrl = searchParams.get('returnUrl');
    if (returnUrl) {
      setAuthReturnUrl(returnUrl);
    }
  }, [searchParams]);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        toast.error(t('messages.error.fetchFailed'), {
          id: 'auth-oauth-error',
        });
        return;
      }

      if (code) {
        try {
          setAuthLoading(true);
          setLoading(true);

          // Exchange the authorization code for tokens
          const response = await fetch(`${getAuthBaseUrl()}/auth/google/exchange`, {
            method: 'POST',
            headers: getUnauthHeaders(),
            body: JSON.stringify({ code }),
          });

          if (response.ok) {
            const responseData = await response.json();
            const authData = responseData.data;

            // Store the access token and session token
            const tokens = {
              accessToken: authData.accessToken,
              accessTokenExpiresAt: new Date(authData.accessTokenExpiresAt),
              sessionToken: authData.sessionToken
            };

            setUser(authData.user);
            setTokens(tokens);
            setAuthenticated(true);

            // Clear the URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Token exchange failed:', errorData);
            toast.error(t('messages.error.fetchFailed'), {
              id: 'auth-oauth-error',
            });
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          toast.error(t('messages.error.fetchFailed'), {
            id: 'auth-oauth-error',
          });
        } finally {
          setAuthLoading(false);
          setLoading(false);
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, setUser, setTokens, setAuthenticated, setLoading]);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated && user) {
      const returnUrl = getAuthReturnUrl();
      if (returnUrl) {
        clearAuthReturnUrl();
        navigate(returnUrl, { replace: true });
        return;
      }
      // Check if user has a selected household
      if (user.selectedHouseholdId) {
        navigate('/dashboard');
      } else {
        // User needs to create or join a household
        navigate('/onboarding');
      }
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    // Check for error in URL
    const error = searchParams.get('error');
    if (error) {
      console.error('Authentication error:', error);
      // You could show a toast or error message here
    }
  }, [searchParams]);

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      // Navigation will be handled by the useEffect above after authentication
    } catch (error) {
      console.error('Google auth failed:', error);
      // You could show an error message here
    } finally {
      setAuthLoading(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('pages.auth.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('pages.auth.backToHome')}
        </Button>

        <Card className="bg-card/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 flex items-center justify-center">
              <img src="/favicon.ico" alt="MyFridge" className="w-16 h-16" />
            </div>
            <CardTitle className="text-2xl">{t('pages.auth.welcomeToMyFridge')}</CardTitle>
            <CardDescription>
              {t('pages.auth.signInDescription')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={authLoading || !import.meta.env.VITE_GOOGLE_CLIENT_ID}
              className="w-full flex items-center justify-center gap-3 rounded-full border border-border bg-card px-6 py-4 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
            >
              {authLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary"></div>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {authLoading ? t('pages.auth.signingIn') : t('pages.auth.continueWithGoogle')}
            </button>

            {import.meta.env.DEV && !import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <div className="text-sm text-destructive text-center p-3 bg-destructive/10 rounded">
                {t('pages.auth.googleClientIdNotConfigured')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
