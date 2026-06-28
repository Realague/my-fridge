import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useExpirationNotificationStore } from '@/stores/expirationNotificationStore';
import { useHouseholdStore } from '@/stores/householdStore';

import { HouseholdSwitcher } from './HouseholdSwitcher';
import { NotificationSheet } from './NotificationSheet';
import { UserMenu } from './UserMenu';

export const AppHeader = () => {
  const { t } = useTranslation();
  const [notifOpen, setNotifOpen] = useState(false);

  const selectedHouseholdId = useHouseholdStore((state) => state.selectedHouseholdId);
  const unreadCount = useExpirationNotificationStore((s) =>
    s.notifications.filter((n) => !n.readByCurrentUser).length,
  );

  return (
    <>
      <header
        className="sticky top-0 z-40 h-14 w-full border-b border-mf-night-line bg-mf-night/85 backdrop-blur-sm"
        role="banner"
      >
        <div className="flex h-full items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center min-w-0 flex-1">
            <HouseholdSwitcher />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-full bg-mf-night-surface text-mf-text hover:bg-mf-night-elevated"
              onClick={() => setNotifOpen(true)}
              aria-label={t('header.openNotifications')}
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-mf-danger p-0 px-1 text-[9px] font-bold text-white ring-2 ring-mf-night">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      <NotificationSheet
        open={notifOpen}
        onOpenChange={setNotifOpen}
        householdId={selectedHouseholdId}
      />
    </>
  );
};
