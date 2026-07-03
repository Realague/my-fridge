import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronDown, ListChecks, Trash2, Utensils, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ItemImage } from '@/components/ItemImage';
import { cn } from '@/lib/utils';
import { StockExitType } from '@/types/enums';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useExpirationNotificationStore } from '@/stores/expirationNotificationStore';
import { ExpirationNotification } from '@/types/expirationNotification';
import { getDisplayUnitLabel } from '@/utils/unitSystem';

interface ExitSuggestionCardProps {
  householdId: string | null | undefined;
}

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

const daysSince = (date: string): number => {
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Surfaces exit-suggestion notifications (items expired 3+ days) as individual
 * rows: thumbnail + "expired since Xd · N units" + Jeté / Mangé / Ignorer.
 * Never auto-acts.
 */
export function ExitSuggestionCard({ householdId }: ExitSuggestionCardProps) {
  const { t } = useTranslation();
  const notifications = useExpirationNotificationStore((s) => s.notifications);
  const markRead = useExpirationNotificationStore((s) => s.markRead);
  const removeOne = useExpirationNotificationStore((s) => s.removeOne);
  const exitStoredItem = useStoredItemStore((s) => s.exitStoredItem);
  const getStoredItemById = useStoredItemStore((s) => s.getStoredItemById);

  const [expanded, setExpanded] = useState(true);

  const suggestions = notifications.filter(
    (n) => n.phase === 'exit_suggestion' && n.storedItemId
  );

  if (suggestions.length === 0) return null;

  const dismiss = async (notification: ExpirationNotification) => {
    if (!householdId) return;
    // Mark read so the suggestion no longer surfaces; kept in history.
    await markRead(householdId, notification.id);
    await removeOne(householdId, notification.id);
  };

  const act = async (notification: ExpirationNotification, type: StockExitType) => {
    if (!notification.storedItemId) return;
    try {
      await exitStoredItem(notification.storedItemId, type, notification.quantity ?? 1);
    } catch {
      // toast already raised by store
    }
    // The item left the stock; drop the suggestion too.
    if (householdId) {
      await removeOne(householdId, notification.id);
    }
  };

  return (
    <div className="rounded-[20px] border border-[#ffe2ac] bg-gradient-to-b from-[#fff6e6] to-card p-4 sm:p-5 shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex flex-1 items-center gap-4 min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[15px] bg-mf-danger-soft text-mf-danger">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-base tracking-tight">
              {t('stockExit.suggestion.bannerTitle', { count: suggestions.length })}
            </div>
            <div className="text-[13px] text-muted-foreground mt-0.5">
              {t('stockExit.suggestion.subtitle')}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="green"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full justify-center gap-2 sm:w-auto sm:shrink-0"
        >
          <ListChecks className="h-4 w-4" />
          {t('stockExit.suggestion.cta')}
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 flex flex-col gap-2.5 border-t border-dashed border-black/5 pt-4">
      {suggestions.map((n) => {
        const name = translateItemName(n.itemName, n.itemHouseholdId, t);
        const stored = n.storedItemId ? getStoredItemById(n.storedItemId) : null;
        const qty = n.quantity ?? 1;
        const unitLabel = getDisplayUnitLabel(n.unit ?? 'piece', qty, t, {
          item: stored?.item,
          itemName: name,
        });
        const qtyText = unitLabel ? `${qty} ${unitLabel}` : `${qty} ${name.toLowerCase()}`;

        return (
          <div
            key={n.id}
            className="flex items-center gap-3 rounded-[16px] border border-black/5 bg-white px-4 py-3 shadow-sm"
          >
            <ItemImage
              src={stored?.item?.imageUrl ?? null}
              alt={name}
              containerClassName="w-11 h-11 rounded-[12px] shrink-0"
              fallbackIconSize={22}
              category={stored?.item?.category}
            />

            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-sm truncate">{name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t('stockExit.suggestion.expiredSince', {
                  days: daysSince(n.expirationDate),
                  qty: qtyText,
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Mobile: icon-only soft squares. Desktop: labelled pills. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => act(n, StockExitType.WASTED)}
                aria-label={t('stockExit.wasted')}
                className="h-9 w-9 p-0 gap-1.5 rounded-full bg-mf-danger-soft text-mf-danger hover:bg-mf-danger-soft/80 sm:w-auto sm:px-3 sm:bg-mf-danger sm:text-white sm:hover:bg-mf-danger/90"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('stockExit.wasted')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => act(n, StockExitType.CONSUMED)}
                aria-label={t('stockExit.suggestion.ate')}
                className="h-9 w-9 p-0 gap-1.5 rounded-full bg-mf-green-soft text-mf-green-deep hover:bg-mf-green-soft/80 sm:w-auto sm:px-3"
              >
                <Utensils className="h-4 w-4" />
                <span className="hidden sm:inline">{t('stockExit.suggestion.ate')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismiss(n)}
                aria-label={t('stockExit.suggestion.ignore')}
                className="h-9 w-9 p-0 gap-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/70 sm:w-auto sm:px-3"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">{t('stockExit.suggestion.ignore')}</span>
              </Button>
            </div>
          </div>
        );
      })}
        </div>
      )}
    </div>
  );
}
