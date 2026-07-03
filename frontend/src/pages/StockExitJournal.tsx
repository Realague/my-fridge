import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, History, Loader2 } from 'lucide-react';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useHouseholdStore } from '@/stores/householdStore';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { useAuthStore } from '@/stores/authStore';
import { useDateFormat } from '@/utils/dateFormatting';
import { groupExitsByDay } from '@/utils/journalGrouping';
import { StockExitType } from '@/types/enums';
import { useStockExitJournal } from '@/hooks/useStockExitJournal';
import type { JournalPeriod } from '@/utils/journalPeriods';
import BottomNavigation from '@/components/BottomNavigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { JournalSummary } from '@/components/journal/JournalSummary';
import { JournalToolbar, type TypeFilter } from '@/components/journal/JournalToolbar';
import { JournalDayGroup } from '@/components/journal/JournalDayGroup';
import { JournalEmptyState } from '@/components/journal/JournalEmptyState';

export default function StockExitJournal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatDate } = useDateFormat();
  const { selectedHouseholdId } = useProtectedRoute();

  const [period, setPeriod] = useState<JournalPeriod>('this_month');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const now = useRef(new Date()).current;

  // Household members + name (for the member filter + subtitle).
  const householdDetails = useHouseholdStore((s) =>
    s.selectedHouseholdId ? s.householdDetails[s.selectedHouseholdId] : undefined
  );
  const fetchHouseholdDetails = useHouseholdStore((s) => s.fetchHouseholdDetails);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (selectedHouseholdId && !householdDetails) {
      fetchHouseholdDetails(selectedHouseholdId);
    }
  }, [selectedHouseholdId, householdDetails, fetchHouseholdDetails]);

  // Storage areas → id→type map for the correct per-row icon.
  const storageAreas = useStorageAreaStore((s) =>
    selectedHouseholdId ? s.storageAreasByHousehold[selectedHouseholdId] : undefined
  );
  const fetchStorageAreas = useStorageAreaStore((s) => s.fetchStorageAreas);

  useEffect(() => {
    if (selectedHouseholdId && !storageAreas) {
      fetchStorageAreas();
    }
  }, [selectedHouseholdId, storageAreas, fetchStorageAreas]);

  const storageTypeById = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    (storageAreas ?? []).forEach((area) => {
      map[area.id] = area.type;
    });
    return map;
  }, [storageAreas]);

  const members = householdDetails?.members ?? [];
  const householdName = householdDetails?.name ?? '';

  const filters = useMemo(
    () => ({
      period,
      exitedBy: memberFilter === 'all' ? undefined : memberFilter,
      exitType: typeFilter === 'all' ? undefined : (typeFilter as StockExitType),
    }),
    [period, memberFilter, typeFilter]
  );

  const { entries, stats, range, loading, loadingMore, hasMore, error, loadMore } =
    useStockExitJournal(selectedHouseholdId, filters);

  const groups = useMemo(() => groupExitsByDay(entries), [entries]);

  const counts = useMemo(() => {
    const c = stats?.current ?? { consumed: 0, wasted: 0, removed: 0 };
    return {
      all: c.consumed + c.wasted + c.removed,
      consumed: c.consumed,
      wasted: c.wasted,
      removed: c.removed,
    };
  }, [stats]);

  const periodLabel = range.monthDate
    ? formatDate(range.monthDate, 'MMMM')
    : t(`stockExit.journal.periods.${period}`);
  const previousMonthLabel = range.previousMonthDate
    ? formatDate(range.previousMonthDate, 'MMM')
    : null;

  // Infinite scroll.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (obsEntries) => {
        if (obsEntries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '250px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const resetFilters = useCallback(() => {
    setTypeFilter('all');
    setMemberFilter('all');
  }, []);

  const filtersActive = typeFilter !== 'all' || memberFilter !== 'all';
  const isInitialLoading = loading && entries.length === 0;

  let emptyVariant: 'empty' | 'no-results' | 'period-empty' | null = null;
  if (!isInitialLoading && entries.length === 0) {
    if (filtersActive) emptyVariant = 'no-results';
    else if (period !== 'all' && counts.all === 0) emptyVariant = 'period-empty';
    else emptyVariant = 'empty';
  }

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-10">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border/20 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <nav className="mb-3 hidden lg:block" aria-label="Breadcrumb">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/products">{t('pages.myProducts.title')}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{t('stockExit.journalTitle')}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mf-night-elevated text-mf-text lg:hidden"
              aria-label={t('common.back')}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>

            <span className="hidden h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-mf-green-soft text-mf-green-deep lg:flex">
              <History className="h-5 w-5" aria-hidden />
            </span>

            <div className="min-w-0">
              <h1 className="flex items-center gap-2 truncate font-display text-xl font-bold text-foreground lg:text-[30px] lg:tracking-tight">
                <History className="h-5 w-5 text-mf-green-deep lg:hidden" aria-hidden />
                {t('stockExit.journalTitle')}
              </h1>
              <p className="truncate text-sm text-mf-text-soft">
                {t('stockExit.journal.subtitle', {
                  count: counts.all,
                  period: periodLabel,
                  household: householdName,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto space-y-5 px-4 py-6">
        <JournalSummary stats={stats} previousMonthLabel={previousMonthLabel} loading={loading} />

        <JournalToolbar
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          counts={counts}
          period={period}
          onPeriodChange={setPeriod}
          members={members}
          currentUserId={currentUserId}
          memberFilter={memberFilter}
          onMemberChange={setMemberFilter}
        />

        {/* Timeline */}
        {isInitialLoading ? (
          <div className="flex justify-center py-16 text-mf-text-mute">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-mf-danger">{error}</div>
        ) : emptyVariant === 'empty' ? (
          <JournalEmptyState variant="empty" />
        ) : emptyVariant === 'no-results' ? (
          <JournalEmptyState variant="no-results" onReset={resetFilters} />
        ) : emptyVariant === 'period-empty' ? (
          <JournalEmptyState variant="period-empty" />
        ) : (
          <div>
            {groups.map((group) => (
              <JournalDayGroup
                key={group.dayStart.getTime()}
                group={group}
                now={now}
                currentUserId={currentUserId}
                storageTypeById={storageTypeById}
                showMember={members.length > 1}
              />
            ))}

            {/* Infinite-scroll sentinel + loader */}
            <div ref={sentinelRef} className="h-4" />
            {loadingMore ? (
              <div className="flex justify-center py-4 text-mf-text-mute">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              </div>
            ) : null}

            <p className="mt-6 text-center text-xs text-mf-text-mute">
              {t('stockExit.journal.footerNote')}
            </p>
          </div>
        )}
      </div>

      <div className="lg:hidden">
        <BottomNavigation currentPage="storage" />
      </div>
    </div>
  );
}
