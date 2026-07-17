import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StockExitType } from '@/types/enums';
import {
  stockExitService,
  type StockExitDto,
  type StockExitStatsResult,
} from '@/services/stockExitService';
import { getPeriodRange, type JournalPeriod, type PeriodRange } from '@/utils/journalPeriods';

const PAGE_SIZE = 30;

export interface JournalFilters {
  period: JournalPeriod;
  /** Member userId, or undefined for all members. */
  exitedBy?: string;
  /** Exit type, or undefined for all types. */
  exitType?: StockExitType;
}

export interface UseStockExitJournalResult {
  entries: StockExitDto[];
  stats: StockExitStatsResult | null;
  range: PeriodRange;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
}

/**
 * Read-only data layer for the Journal des sorties page: fetches the paginated,
 * server-filtered timeline plus the aggregated summary stats, and accumulates
 * pages for infinite scroll. Any filter change resets and refetches; a request
 * token guards against out-of-order responses.
 */
export function useStockExitJournal(
  householdId: string | null,
  filters: JournalFilters
): UseStockExitJournalResult {
  // Freeze "now" for the lifetime of the page so period bounds stay stable.
  const now = useRef(new Date()).current;
  const range = useMemo(() => getPeriodRange(filters.period, now), [filters.period, now]);

  const [entries, setEntries] = useState<StockExitDto[]>([]);
  const [stats, setStats] = useState<StockExitStatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqRef = useRef(0);

  const listOpts = useMemo(
    () => ({
      from: range.from,
      to: range.to,
      exitType: filters.exitType,
      exitedBy: filters.exitedBy,
    }),
    [range.from, range.to, filters.exitType, filters.exitedBy]
  );

  // Reset + first page (+ stats) whenever the household or filters change.
  useEffect(() => {
    if (!householdId) return;
    const token = ++reqRef.current;
    setLoading(true);
    setError(null);

    Promise.all([
      stockExitService.listExits(householdId, { ...listOpts, limit: PAGE_SIZE, offset: 0 }),
      stockExitService.getStats(householdId, {
        from: range.from,
        to: range.to,
        previousFrom: range.previousFrom,
        previousTo: range.previousTo,
        exitedBy: filters.exitedBy,
      }),
    ])
      .then(([page, statsResult]) => {
        if (token !== reqRef.current) return;
        setEntries(page);
        setHasMore(page.length === PAGE_SIZE);
        setStats(statsResult);
      })
      .catch((err) => {
        if (token !== reqRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load journal');
      })
      .finally(() => {
        if (token === reqRef.current) setLoading(false);
      });
  }, [householdId, listOpts, range.from, range.to, range.previousFrom, range.previousTo, filters.exitedBy]);

  const loadMore = useCallback(() => {
    if (!householdId || loadingMore || !hasMore) return;
    const token = reqRef.current;
    setLoadingMore(true);

    stockExitService
      .listExits(householdId, { ...listOpts, limit: PAGE_SIZE, offset: entries.length })
      .then((page) => {
        if (token !== reqRef.current) return;
        setEntries((prev) => [...prev, ...page]);
        setHasMore(page.length === PAGE_SIZE);
      })
      .catch((err) => {
        if (token !== reqRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load more');
      })
      .finally(() => {
        if (token === reqRef.current) setLoadingMore(false);
      });
  }, [householdId, loadingMore, hasMore, listOpts, entries.length]);

  return { entries, stats, range, loading, loadingMore, hasMore, error, loadMore };
}
