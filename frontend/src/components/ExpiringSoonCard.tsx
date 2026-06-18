import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChefHat, Snowflake, Trash2 } from 'lucide-react';

import { useExpirationNotificationStore } from '@/stores/expirationNotificationStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { ExpirationUrgency, ExpiringNowItem } from '@/types/expirationNotification';
import { StorageAreaType } from '@/types/enums';
import { getTranslatedUnitLabel } from '@/utils/unitSystem';
import { scrollRevealFadeUp } from '@/lib/motion';
import { PushOptInBanner } from '@/components/PushOptInBanner';

const MAX_VISIBLE = 5;

const urgencyOrder: Record<ExpirationUrgency, number> = {
  expired: 0,
  today: 1,
  tomorrow: 2,
  soon: 3,
};

interface ExpiringSoonCardProps {
  householdId: string | null | undefined;
}

export const ExpiringSoonCard = ({ householdId }: ExpiringSoonCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion() ?? false;

  const expiringNow = useExpirationNotificationStore((s) => s.expiringNow);
  const refreshExpiringNow = useExpirationNotificationStore((s) => s.refreshExpiringNow);
  const refreshNotifications = useExpirationNotificationStore((s) => s.refreshNotifications);

  const { deleteStoredItem, updateStoredItem } = useStoredItemStore();
  const getStorageAreas = useStorageAreaStore((s) => s.getStorageAreasForHousehold);

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const sortedItems = useMemo(() => {
    if (!expiringNow) return [];
    return [...expiringNow.items].sort((a, b) => {
      const cmp = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (cmp !== 0) return cmp;
      return a.daysUntilExpiration - b.daysUntilExpiration;
    });
  }, [expiringNow]);

  const visibleItems = showAll ? sortedItems : sortedItems.slice(0, MAX_VISIBLE);
  const hiddenCount = sortedItems.length - MAX_VISIBLE;

  if (!sortedItems.length) return null;

  const refreshAfterAction = async () => {
    if (!householdId) return;
    await Promise.all([refreshExpiringNow(householdId), refreshNotifications(householdId)]);
  };

  const handleDiscard = async (item: ExpiringNowItem) => {
    if (pendingId) return;
    setPendingId(item.storedItemId);
    try {
      await deleteStoredItem(item.storedItemId);
      toast.success(
        t('pages.dashboard.expiringSoon.discardedToast', {
          name: translateItemName(item.itemName, item.itemHouseholdId, t),
        })
      );
      await refreshAfterAction();
    } catch (error) {
      console.error('discard failed', error);
      toast.error(t('messages.error.requestFailed'));
    } finally {
      setPendingId(null);
    }
  };

  const handleFreeze = async (item: ExpiringNowItem) => {
    if (pendingId) return;
    const freezer = getStorageAreas().find((a) => a.type === StorageAreaType.FREEZER);
    if (!freezer) {
      toast.error(t('pages.dashboard.expiringSoon.noFreezer'));
      return;
    }
    setPendingId(item.storedItemId);
    try {
      const today = new Date().toISOString().split('T')[0];
      await updateStoredItem(item.storedItemId, {
        storageAreaId: freezer.id,
        frozenDate: today,
        expirationDate: null,
      });
      toast.success(
        t('pages.dashboard.expiringSoon.frozenToast', {
          name: translateItemName(item.itemName, item.itemHouseholdId, t),
          freezer: freezer.name,
        })
      );
      await refreshAfterAction();
    } catch (error) {
      console.error('freeze failed', error);
      toast.error(t('messages.error.requestFailed'));
    } finally {
      setPendingId(null);
    }
  };

  const handleRecipes = (item: ExpiringNowItem) => {
    const params = new URLSearchParams({ itemId: item.itemId });
    if (item.itemName) params.set('itemName', item.itemName);
    navigate(`/recipes?${params.toString()}`);
  };

  return (
    <Card className="border-mf-danger/30 bg-mf-danger-soft">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-mf-danger">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="truncate">{t('pages.dashboard.expiringSoon.title')}</span>
            </CardTitle>
            <CardDescription className="text-mf-text-soft mt-1">
              {t('pages.dashboard.expiringSoon.subtitle', { count: sortedItems.length })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="space-y-3">
          {visibleItems.map((item, index) => (
            <motion.div
              key={item.storedItemId}
              {...scrollRevealFadeUp(prefersReducedMotion)}
              transition={{
                ...scrollRevealFadeUp(prefersReducedMotion).transition,
                delay: prefersReducedMotion ? 0 : index * 0.04,
              }}
            >
              <ExpiringSoonRow
                item={item}
                pending={pendingId === item.storedItemId}
                onDiscard={() => handleDiscard(item)}
                onFreeze={() => handleFreeze(item)}
                onRecipes={() => handleRecipes(item)}
              />
            </motion.div>
          ))}

          <PushOptInBanner />

          {!showAll && hiddenCount > 0 && (
            <Button
              variant="ghost"
              className="w-full text-mf-danger hover:bg-mf-danger-soft"
              onClick={() => setShowAll(true)}
            >
              {t('pages.dashboard.expiringSoon.viewMore', { count: hiddenCount })}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface RowProps {
  item: ExpiringNowItem;
  pending: boolean;
  onDiscard: () => void;
  onFreeze: () => void;
  onRecipes: () => void;
}

const ExpiringSoonRow = ({ item, pending, onDiscard, onFreeze, onRecipes }: RowProps) => {
  const { t } = useTranslation();
  const isExpired = item.urgency === 'expired';
  const isToday = item.urgency === 'today';
  const isTomorrow = item.urgency === 'tomorrow';

  const containerClasses = [
    'rounded-lg border bg-card transition-colors',
    isExpired ? 'border-mf-danger/40 bg-mf-danger-soft' : '',
    !isExpired && isToday ? 'border-l-4 border-l-mf-danger border-mf-danger/30' : '',
    !isExpired && isTomorrow ? 'border-l-4 border-l-mf-warning border-mf-warning/30' : '',
    !isExpired && !isToday && !isTomorrow ? 'border-mf-night-line' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const badge = isExpired
    ? { variant: 'destructive' as const, label: t('pages.dashboard.expiringSoon.badgeExpired') }
    : isToday
    ? { variant: 'destructive' as const, label: t('pages.dashboard.expiringSoon.badgeToday') }
    : isTomorrow
    ? { variant: 'secondary' as const, label: t('pages.dashboard.expiringSoon.badgeTomorrow') }
    : {
        variant: 'secondary' as const,
        label: t('pages.dashboard.expiringSoon.badgeInDays', { count: item.daysUntilExpiration }),
      };

  const action = isExpired
    ? { icon: <Trash2 className="h-4 w-4" />, label: t('pages.dashboard.expiringSoon.actionDiscard'), onClick: onDiscard }
    : isToday
    ? { icon: <Snowflake className="h-4 w-4" />, label: t('pages.dashboard.expiringSoon.actionFreeze'), onClick: onFreeze }
    : { icon: <ChefHat className="h-4 w-4" />, label: t('pages.dashboard.expiringSoon.actionRecipes'), onClick: onRecipes };

  const openedSubline = item.isOpened && item.openedDate
    ? t('pages.dashboard.expiringSoon.openedDaysAgo', { count: daysSince(item.openedDate) })
    : null;

  const quantityLabel = `${formatQuantity(item.quantity)} ${getTranslatedUnitLabel(item.unit, item.quantity, t)}`;

  return (
    <div className={`${containerClasses} p-3 flex flex-col sm:flex-row sm:items-center gap-3`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-foreground truncate">
            {translateItemName(item.itemName, item.itemHouseholdId, t)}
          </span>
          <Badge variant={badge.variant} className="shrink-0">{badge.label}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {quantityLabel} · {item.storageAreaName}
        </div>
        {openedSubline && (
          <div className="text-xs text-muted-foreground mt-0.5">{openedSubline}</div>
        )}
      </div>
      <Button
        size="sm"
        variant={isExpired ? 'destructive' : 'outline'}
        onClick={action.onClick}
        disabled={pending}
        className="shrink-0 self-start sm:self-auto"
      >
        {action.icon}
        <span className="ml-2">{action.label}</span>
      </Button>
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

const daysSince = (isoDate: string): number => {
  const opened = new Date(isoDate);
  const now = new Date();
  const start = new Date(opened.getFullYear(), opened.getMonth(), opened.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
};

const formatQuantity = (q: number): string => {
  if (Number.isInteger(q)) return q.toString();
  return q.toFixed(2).replace(/\.?0+$/, '');
};
