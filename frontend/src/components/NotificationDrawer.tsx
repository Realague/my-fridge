import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useExpirationNotificationStore } from '@/stores/expirationNotificationStore';
import { ExpirationNotification } from '@/types/expirationNotification';

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string | null | undefined;
}

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ open, onOpenChange, householdId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notifications = useExpirationNotificationStore((s) => s.notifications);
  const markRead = useExpirationNotificationStore((s) => s.markRead);
  const markAllRead = useExpirationNotificationStore((s) => s.markAllRead);
  const removeOne = useExpirationNotificationStore((s) => s.removeOne);
  const clearAll = useExpirationNotificationStore((s) => s.clearAll);

  const hasUnread = notifications.some((n) => !n.readByCurrentUser);

  const handleNotificationClick = async (notification: ExpirationNotification) => {
    if (!householdId) return;
    if (!notification.readByCurrentUser) {
      await markRead(householdId, notification.id);
    }
    if (notification.storageAreaId) {
      navigate(`/storage/${notification.storageAreaId}`);
    } else {
      navigate('/dashboard');
    }
    onOpenChange(false);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!householdId) return;
    await markRead(householdId, id);
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!householdId) return;
    await removeOne(householdId, id);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('notifications.title')}
              {notifications.length > 0 && (
                <Badge variant="secondary">{notifications.length}</Badge>
              )}
            </DrawerTitle>
            <div className="flex items-center gap-1">
              {hasUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => householdId && markAllRead(householdId)}
                  className="text-xs px-2"
                >
                  <CheckCheck className="h-4 w-4" />
                  {t('notifications.markAllRead')}
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => householdId && clearAll(householdId)}
                  className="text-xs text-mf-danger hover:text-mf-danger/80 px-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('notifications.clearAll')}
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-stone-300 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('notifications.noNotifications')}</h3>
              <p className="text-muted-foreground">{t('notifications.allCaughtUp')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onMarkRead={(e) => handleMarkAsRead(e, notification.id)}
                  onRemove={(e) => handleRemove(e, notification.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};

interface NotificationRowProps {
  notification: ExpirationNotification;
  onClick: () => void;
  onMarkRead: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
}

const NotificationRow: React.FC<NotificationRowProps> = ({ notification, onClick, onMarkRead, onRemove }) => {
  const { t } = useTranslation();

  const isReminder = notification.phase === 'reminder';
  const isUnread = !notification.readByCurrentUser;
  const displayName = translateItemName(notification.itemName, notification.itemHouseholdId, t);

  const bgClass = isUnread
    ? isReminder
      ? 'bg-mf-danger-soft'
      : 'bg-mf-warning-soft'
    : 'bg-muted';
  const accent = isReminder ? 'border-l-mf-danger' : 'border-l-mf-warning';

  const diffDays = daysFromToday(notification.expirationDate);
  const title =
    diffDays < 0
      ? t('expirationNotifications.titleExpired', { name: displayName, count: Math.abs(diffDays) })
      : diffDays === 0
      ? t('expirationNotifications.titleToday', { name: displayName })
      : isReminder || diffDays === 1
      ? t('expirationNotifications.titleReminder', { name: displayName })
      : t('expirationNotifications.titleInitial', { name: displayName, count: diffDays });

  const messageParts: string[] = [];
  if (notification.isOpened && notification.openedDate) {
    messageParts.push(
      t('expirationNotifications.openedDaysAgo', { count: daysSince(notification.openedDate) })
    );
  }
  if (notification.storageAreaName) {
    messageParts.push(notification.storageAreaName);
  }
  const message = messageParts.join(' · ');

  return (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-all ${bgClass} ${
        isUnread ? `border-l-4 ${accent}` : 'border-stone-200 dark:border-stone-800'
      } hover:shadow-md`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="text-xl">{isReminder ? '⏰' : '🥬'}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-medium ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</h4>
              {isUnread && <div className="w-2 h-2 bg-mf-green rounded-full" />}
            </div>
            {message && <p className="text-sm text-muted-foreground mb-2">{message}</p>}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isUnread && (
            <Button variant="ghost" size="sm" onClick={onMarkRead} className="h-8 w-8 p-0 hover:bg-white/50">
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 hover:bg-mf-danger-soft text-muted-foreground hover:text-mf-danger"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const translateItemName = (
  name: string,
  itemHouseholdId: string | null,
  t: (key: string, options?: Record<string, unknown>) => string
): string => {
  if (itemHouseholdId !== null && itemHouseholdId !== undefined) return name;
  const key = `items.${name}`;
  const translated = t(key);
  return translated && translated !== key ? translated : name;
};

const daysFromToday = (isoDate: string): number => {
  const exp = new Date(isoDate);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
};

const daysSince = (isoDate: string): number => {
  const opened = new Date(isoDate);
  const now = new Date();
  const start = new Date(opened.getFullYear(), opened.getMonth(), opened.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
};

export default NotificationDrawer;
