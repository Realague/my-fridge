import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useExpirationNotificationStore } from '@/stores/expirationNotificationStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { ExpirationUrgency, ExpiringNowItem } from '@/types/expirationNotification';
import { StockExitType, StorageAreaType } from '@/types/enums';

/**
 * Urgency buckets, in display order. `expired` is not in the design mock but the
 * API returns it — dropping it would hide the *most* urgent items from the
 * dashboard, so it leads as a fourth group.
 */
const GROUP_ORDER: ExpirationUrgency[] = ['expired', 'today', 'tomorrow', 'soon'];

/** Freezing only makes sense while the item is still edible and genuinely urgent. */
const FREEZABLE_GROUPS: ReadonlySet<ExpirationUrgency> = new Set<ExpirationUrgency>([
  'today',
  'tomorrow',
]);

export interface ExpiringGroupModel {
  key: ExpirationUrgency;
  items: ExpiringNowItem[];
}

export type ExpiringStatus = 'loading' | 'error' | 'ready';

export const canFreezeGroup = (key: ExpirationUrgency): boolean => FREEZABLE_GROUPS.has(key);

/**
 * Owns everything the "expiring soon" card does: bucketing, counts, the summary
 * line, and the optimistic resolve/rollback for each action. The components stay
 * pure rendering.
 */
export const useExpiringSoon = (householdId: string | null | undefined) => {
  const { t } = useTranslation();

  const expiringNow = useExpirationNotificationStore((s) => s.expiringNow);
  const error = useExpirationNotificationStore((s) => s.error);
  const refreshExpiringNow = useExpirationNotificationStore((s) => s.refreshExpiringNow);
  const refreshNotifications = useExpirationNotificationStore((s) => s.refreshNotifications);

  const exitStoredItem = useStoredItemStore((s) => s.exitStoredItem);
  const freezeStoredItem = useStoredItemStore((s) => s.freezeStoredItem);
  const getStorageAreas = useStorageAreaStore((s) => s.getStorageAreasForHousehold);

  /** Rows being resolved: hidden from the list the instant the user clicks. */
  const [resolvingIds, setResolvingIds] = useState<ReadonlySet<string>>(() => new Set());
  /**
   * Whether the user has resolved at least one row in this session. Drives the
   * difference between "hide the card" (nothing to do on arrival) and "show the
   * compact congratulation" (they just cleared it). A ref is enough: it is only
   * read when the count drops to 0, which already triggers a render.
   */
  const hasResolvedRef = useRef(false);

  // Once data has arrived the card stays usable, even if a later refresh errors.
  const status: ExpiringStatus =
    expiringNow !== null ? 'ready' : error ? 'error' : 'loading';

  const groups = useMemo<ExpiringGroupModel[]>(() => {
    if (!expiringNow) return [];

    const buckets = new Map<ExpirationUrgency, ExpiringNowItem[]>(
      GROUP_ORDER.map((key) => [key, []])
    );

    for (const item of expiringNow.items) {
      if (resolvingIds.has(item.storedItemId)) continue;
      buckets.get(item.urgency)?.push(item);
    }

    return GROUP_ORDER.map((key) => ({
      key,
      items: (buckets.get(key) ?? []).sort(
        (a, b) =>
          a.daysUntilExpiration - b.daysUntilExpiration ||
          a.itemName.localeCompare(b.itemName)
      ),
    })).filter((group) => group.items.length > 0);
  }, [expiringNow, resolvingIds]);

  const totalCount = useMemo(
    () => groups.reduce((sum, group) => sum + group.items.length, 0),
    [groups]
  );

  /** e.g. "1 périmé · 2 aujourd'hui · 3 cette semaine" — empty groups omitted. */
  const summary = useMemo(() => {
    if (totalCount === 0) return t('pages.dashboard.expiringSoon.summaryAllClear');
    return groups
      .map((group) =>
        t(`pages.dashboard.expiringSoon.summary.${group.key}`, { count: group.items.length })
      )
      .join(' · ');
  }, [groups, totalCount, t]);

  /**
   * Mirrors `resolvingIds` synchronously. State updates are batched, so two
   * rapid clicks on the same row would both read a stale Set and fire the
   * mutation twice; the ref closes that window.
   */
  const inFlightRef = useRef<Set<string>>(new Set());

  const markResolving = useCallback((storedItemId: string) => {
    inFlightRef.current.add(storedItemId);
    setResolvingIds((previous) => new Set(previous).add(storedItemId));
  }, []);

  const unmarkResolving = useCallback((storedItemId: string) => {
    inFlightRef.current.delete(storedItemId);
    setResolvingIds((previous) => {
      const next = new Set(previous);
      next.delete(storedItemId);
      return next;
    });
  }, []);

  const refreshAfterAction = useCallback(async () => {
    if (!householdId) return;
    await Promise.all([refreshExpiringNow(householdId), refreshNotifications(householdId)]);
  }, [householdId, refreshExpiringNow, refreshNotifications]);

  /**
   * Shared optimistic wrapper: hide the row, run the mutation, then either let
   * the refreshed server data confirm it or put the row back on failure.
   */
  const resolveRow = useCallback(
    async (item: ExpiringNowItem, mutate: () => Promise<void>) => {
      if (inFlightRef.current.has(item.storedItemId)) return;
      markResolving(item.storedItemId);
      try {
        await mutate();
        hasResolvedRef.current = true;
        // Deliberately stays marked on success: `refreshExpiringNow` swallows
        // its own errors, so unmarking here would make a genuinely resolved row
        // flash back whenever that refresh fails. The id is inert once the
        // server list no longer contains it; `undoResolve` clears it if needed.
        await refreshAfterAction();
      } catch (mutationError) {
        console.error('expiring soon action failed', mutationError);
        // The stores already surface their own error toast — only roll back here.
        unmarkResolving(item.storedItemId);
      }
    },
    [markResolving, unmarkResolving, refreshAfterAction]
  );

  /** Undo path: unhide the row, then pull the restored item back from the server. */
  const undoResolve = useCallback(
    (storedItemId: string) => {
      unmarkResolving(storedItemId);
      void refreshAfterAction();
    },
    [unmarkResolving, refreshAfterAction]
  );

  const exitRow = useCallback(
    (item: ExpiringNowItem, type: StockExitType) =>
      resolveRow(item, () =>
        exitStoredItem(item.storedItemId, type, item.quantity, {
          // `exitStoredItem` owns the "undo" toast and the server call behind
          // it; this hook only has to put the row back afterwards.
          onUndone: () => undoResolve(item.storedItemId),
        })
      ),
    [resolveRow, exitStoredItem, undoResolve]
  );

  const onConsume = useCallback(
    (item: ExpiringNowItem) => exitRow(item, StockExitType.CONSUMED),
    [exitRow]
  );

  const onWaste = useCallback(
    (item: ExpiringNowItem) => exitRow(item, StockExitType.WASTED),
    [exitRow]
  );

  const onFreeze = useCallback(
    async (item: ExpiringNowItem) => {
      const freezer = getStorageAreas().find((area) => area.type === StorageAreaType.FREEZER);
      if (!freezer) {
        toast.error(t('pages.dashboard.expiringSoon.noFreezer'));
        return;
      }
      // Freezing clears the expiration date, so the row leaves the card:
      // same optimistic flow as consume/waste.
      await resolveRow(item, () =>
        freezeStoredItem(item.storedItemId, freezer.id, freezer.name)
      );
    },
    [getStorageAreas, freezeStoredItem, resolveRow, t]
  );

  const onRetry = useCallback(() => {
    if (householdId) void refreshExpiringNow(householdId);
  }, [householdId, refreshExpiringNow]);

  return {
    status,
    groups,
    totalCount,
    summary,
    isEmptyAfterResolution: totalCount === 0 && hasResolvedRef.current,
    resolvingIds,
    onConsume,
    onWaste,
    onFreeze,
    onRetry,
  };
};
