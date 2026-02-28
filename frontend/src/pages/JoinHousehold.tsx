import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';

const AUTH_RETURN_URL_KEY = 'authReturnUrl';

/**
 * Persist returnUrl so Auth can redirect here after Google sign-in.
 * Auth page reads this and navigates after successful login.
 */
export function setAuthReturnUrl(returnUrl: string): void {
  try {
    sessionStorage.setItem(AUTH_RETURN_URL_KEY, returnUrl);
  } catch {
    // ignore
  }
}

export function getAuthReturnUrl(): string | null {
  try {
    return sessionStorage.getItem(AUTH_RETURN_URL_KEY);
  } catch {
    return null;
  }
}

export function clearAuthReturnUrl(): void {
  try {
    sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
  } catch {
    // ignore
  }
}

const JoinHousehold = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code')?.trim().toUpperCase() ?? '';
  const [joining, setJoining] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const joinHousehold = useHouseholdStore(state => state.joinHousehold);

  // Not authenticated: send to auth and come back here after login
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      if (code && code.length === 8) {
        const returnPath = `/join?code=${encodeURIComponent(code)}`;
        setAuthReturnUrl(returnPath);
        navigate(`/auth?returnUrl=${encodeURIComponent(returnPath)}`, { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, code, navigate]);

  // Authenticated with valid code: auto-join
  useEffect(() => {
    if (!isAuthenticated || authLoading || !code || code.length !== 8 || joining) return;

    const doJoin = async () => {
      setJoining(true);
      clearAuthReturnUrl();
      try {
        await joinHousehold(code);
        toast({
          title: t('messages.success.householdJoined'),
          description: t('messages.success.householdJoinedDescription'),
        });
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Failed to join household:', error);
        toast({
          title: t('messages.error.joinFailed'),
          description: t('messages.error.failedToJoinHousehold'),
          variant: 'destructive',
        });
        navigate('/onboarding?step=4', { replace: true });
      } finally {
        setJoining(false);
      }
    };

    doJoin();
  }, [isAuthenticated, authLoading, code, joinHousehold, navigate, t, joining]);

  // Loading state while checking auth or joining
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">
          {joining ? t('pages.household.joiningHousehold') : t('common.loading')}
        </p>
      </div>
    </div>
  );
};

export default JoinHousehold;
