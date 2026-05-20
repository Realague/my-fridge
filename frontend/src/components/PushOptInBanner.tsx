import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePushNotificationsStore } from '@/stores/pushNotificationsStore';
import { isPushSupported } from '@/utils/pushSubscription';

const LATER_COUNT_KEY = 'mf_push_later_count';
const SESSION_DISMISSED_KEY = 'mf_push_dismissed_session';
const MAX_LATER_COUNT = 3;

const getLaterCount = (): number => {
  try {
    const raw = localStorage.getItem(LATER_COUNT_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
};

const incrementLaterCount = (): void => {
  try {
    localStorage.setItem(LATER_COUNT_KEY, String(getLaterCount() + 1));
  } catch {
    // localStorage may be unavailable (incognito) — ignore.
  }
};

const isSessionDismissed = (): boolean => {
  try {
    return sessionStorage.getItem(SESSION_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

const setSessionDismissed = (): void => {
  try {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, '1');
  } catch {
    // ignore
  }
};

export const PushOptInBanner = () => {
  const { t } = useTranslation();
  const supported = isPushSupported();

  const init = usePushNotificationsStore((s) => s.init);
  const enable = usePushNotificationsStore((s) => s.enable);
  const permission = usePushNotificationsStore((s) => s.permission);
  const subscribed = usePushNotificationsStore((s) => s.subscribed);
  const isLoading = usePushNotificationsStore((s) => s.isLoading);
  const initialized = usePushNotificationsStore((s) => s.initialized);

  const [dismissed, setDismissed] = useState<boolean>(() => isSessionDismissed());
  const [laterCount, setLaterCount] = useState<number>(() => getLaterCount());

  useEffect(() => {
    if (supported && !initialized) {
      void init();
    }
  }, [supported, initialized, init]);

  if (!supported) return null;
  if (!initialized) return null;
  if (subscribed) return null;
  if (permission !== 'default') return null;
  if (dismissed) return null;
  if (laterCount >= MAX_LATER_COUNT) return null;

  const handleActivate = async () => {
    const result = await enable();
    if (result.ok) {
      toast.success(t('pages.dashboard.expiringSoon.pushOptIn.enabledToast'));
      setDismissed(true);
    } else if (result.reason === 'denied') {
      toast.error(t('pages.dashboard.expiringSoon.pushOptIn.deniedToast'));
      setDismissed(true);
    } else {
      toast.error(t('messages.error.requestFailed'));
    }
  };

  const handleLater = () => {
    incrementLaterCount();
    setLaterCount((c) => c + 1);
    setSessionDismissed();
    setDismissed(true);
  };

  return (
    <div className="rounded-md bg-mf-green-soft px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="shrink-0 rounded-md bg-mf-night-surface p-2">
            <Bell className="h-4 w-4 text-mf-green-deep" />
          </div>
          <p className="font-display text-sm font-semibold text-mf-green-deep">
            {t('pages.dashboard.expiringSoon.pushOptIn.title')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLater}
            disabled={isLoading}
            className="rounded-full font-display font-semibold text-mf-green-deep hover:bg-mf-green-soft hover:text-mf-green-deep"
          >
            {t('pages.dashboard.expiringSoon.pushOptIn.later')}
          </Button>
          <Button
            size="sm"
            onClick={handleActivate}
            disabled={isLoading}
            className="rounded-full font-display font-bold bg-mf-green text-white hover:bg-mf-green-deep px-4"
          >
            {t('pages.dashboard.expiringSoon.pushOptIn.activate')}
          </Button>
        </div>
      </div>
    </div>
  );
};
