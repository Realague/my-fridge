import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ItemImage } from '@/components/ItemImage';
import { AlertTriangle, ChefHat, Snowflake, Trash2 } from 'lucide-react';

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
    <Card className="border-0 bg-mf-night-surface shadow-none">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0 flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mf-danger-soft text-mf-danger"
            >
              <AlertTriangle className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <CardTitle className="font-display text-mf-text">
                <span className="truncate">{t('pages.dashboard.expiringSoon.title')}</span>
              </CardTitle>
              <CardDescription className="text-mf-text-soft mt-1">
                {t('pages.dashboard.expiringSoon.subtitle', { count: sortedItems.length })}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="space-y-2.5">
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
              className="w-full rounded-full text-mf-danger hover:bg-mf-danger-soft"
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

  // Fresh: rows sit on `sub` cream surfaces, urgency is signalled by the badge
  // pill + the action button — not by tinting the whole row.
  const containerClasses = 'rounded-md bg-mf-night-elevated transition-colors';

  const badge = isExpired
    ? { tone: 'danger' as const, label: t('pages.dashboard.expiringSoon.badgeExpired') }
    : isToday
    ? { tone: 'danger' as const, label: t('pages.dashboard.expiringSoon.badgeToday') }
    : isTomorrow
    ? { tone: 'warn' as const, label: t('pages.dashboard.expiringSoon.badgeTomorrow') }
    : {
        tone: 'neutral' as const,
        label: t('pages.dashboard.expiringSoon.badgeInDays', { count: item.daysUntilExpiration }),
      };

  // Critical = pill plein qui crie ; warn/neutral = soft (info plus calme).
  // Cohérent avec MyProductsItemCard et la charte §02 "couleur = info".
  const badgeClass =
    badge.tone === 'danger'
      ? 'bg-mf-danger text-white'
      : badge.tone === 'warn'
      ? 'bg-mf-warning-soft text-mf-warning'
      : 'bg-mf-night-elevated text-mf-text-soft';

  const action = isExpired
    ? {
        icon: <Trash2 className="h-4 w-4" />,
        label: t('pages.dashboard.expiringSoon.actionDiscard'),
        onClick: onDiscard,
        className: 'bg-mf-danger text-white hover:bg-mf-danger/90',
      }
    : isToday
    ? {
        icon: <Snowflake className="h-4 w-4" />,
        label: t('pages.dashboard.expiringSoon.actionFreeze'),
        onClick: onFreeze,
        className: 'bg-mf-night-elevated text-mf-text hover:bg-mf-night-line',
      }
    : {
        icon: <ChefHat className="h-4 w-4" />,
        label: t('pages.dashboard.expiringSoon.actionRecipes'),
        onClick: onRecipes,
        className: 'bg-mf-night-elevated text-mf-text hover:bg-mf-night-line',
      };

  const openedSubline = item.isOpened && item.openedDate
    ? t('pages.dashboard.expiringSoon.openedDaysAgo', { count: daysSince(item.openedDate) })
    : null;

  const quantityLabel = `${formatQuantity(item.quantity)} ${getTranslatedUnitLabel(item.unit, item.quantity, t)}`;

  const displayName = translateItemName(item.itemName, item.itemHouseholdId, t);

  return (
    <div className={`${containerClasses} p-3 flex flex-col sm:flex-row sm:items-center gap-3`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <ItemImage
          src={item.itemImageUrl}
          alt={displayName}
          fallbackIconSize={24}
          containerClassName="h-11 w-11 rounded-md bg-mf-night-surface"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-display font-bold text-mf-text truncate">
              {displayName}
            </span>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wider leading-none ${badgeClass}`}
            >
              {badge.label}
            </span>
          </div>
          <div className="text-xs text-mf-text-soft">
            {quantityLabel} · {item.storageAreaName}
          </div>
          {openedSubline && (
            <div className="text-[11px] text-mf-text-mute mt-0.5">{openedSubline}</div>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={action.onClick}
        disabled={pending}
        className={`shrink-0 self-start sm:self-auto rounded-full font-display font-bold px-4 ${action.className}`}
      >
        {action.icon}
        <span className="ml-1.5">{action.label}</span>
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
