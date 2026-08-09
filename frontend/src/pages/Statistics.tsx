import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BarChart3 } from 'lucide-react';

import BottomNavigation from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useStoreErrorToast } from '@/hooks/useStoreErrorToast';
import { useStatsStore } from '@/stores/statsStore';
import {
  formatComparisonLabel,
  formatRangeLabel,
  getStatsRange,
  STATS_PERIODS,
  type StatsPeriod,
} from '@/utils/statsPeriods';
import { WasteBlock } from '@/components/stats/WasteBlock';
import { CookingBlock } from '@/components/stats/CookingBlock';
import { HouseholdBlock } from '@/components/stats/HouseholdBlock';
import { MascotNote } from '@/components/stats/MascotNote';
import { cn } from '@/lib/utils';

type BlockKey = 'waste' | 'cooking' | 'household';

const BLOCKS: BlockKey[] = ['waste', 'cooking', 'household'];
const BLOCK_ANCHORS: Record<BlockKey, string> = {
  waste: 'stats-waste',
  cooking: 'stats-cooking',
  household: 'stats-household',
};

const Statistics = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedHouseholdId, isLoading: authLoading, hasHousehold } = useProtectedRoute();

  const stats = useStatsStore((s) => s.stats);
  const loading = useStatsStore((s) => s.loading);
  const period = useStatsStore((s) => s.period);
  const loadStats = useStatsStore((s) => s.loadStats);
  useStoreErrorToast(
    useStatsStore((s) => s.error),
    useStatsStore((s) => s.setError),
  );

  // Mobile mounts a single block at a time, so the block tabs are a real
  // switcher there. Desktop stacks all three on screen at once — tabs would
  // only scroll to something already visible, so they aren't rendered.
  const requestedBlock = searchParams.get('block');
  const [block, setBlock] = useState<BlockKey>(
    BLOCKS.includes(requestedBlock as BlockKey) ? (requestedBlock as BlockKey) : 'waste',
  );

  useEffect(() => {
    if (selectedHouseholdId && !authLoading && hasHousehold) {
      loadStats(selectedHouseholdId, period);
    }
  }, [selectedHouseholdId, authLoading, hasHousehold, period, loadStats]);

  const range = useMemo(() => getStatsRange(period), [period]);
  const rangeLabel = useMemo(() => formatRangeLabel(range, i18n.language), [range, i18n.language]);
  const comparedTo = useMemo(
    () => formatComparisonLabel(range.previousLabelDate, i18n.language),
    [range, i18n.language],
  );

  // Deep link from a dashboard card. On desktop nothing switches — every block
  // is mounted — so bring the requested one into view once it has rendered.
  const deepLinked = BLOCKS.includes(requestedBlock as BlockKey);
  useEffect(() => {
    if (!deepLinked || !stats?.meta.hasAnyData) return;
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    document.getElementById(BLOCK_ANCHORS[requestedBlock as BlockKey])?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [deepLinked, requestedBlock, stats?.meta.hasAnyData]);

  if (authLoading || !hasHousehold) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-mf-green" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const showTrends = Boolean(stats?.meta.comparisonAvailable) && comparedTo !== null;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-10">
      <div className="sticky top-0 z-40 border-b border-border/20 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full border-mf-night-line lg:hidden"
              onClick={() => navigate('/dashboard')}
              aria-label={t('common.back')}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Button>
            <span
              aria-hidden
              className="hidden h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-mf-green-soft text-mf-green-deep lg:flex"
            >
              <BarChart3 className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold text-foreground lg:text-[27px] lg:tracking-tight">
                {t('stats.title')}
              </h1>
              <p className="truncate text-xs font-medium text-mf-text-mute lg:text-sm">
                {rangeLabel}
              </p>
            </div>
          </div>

          {stats?.meta.hasAnyData && (
            <div className="mt-3.5 flex flex-col gap-2.5">
              {/* Même langage visuel que les onglets Recettes : piste sourde,
                  option active en surface claire légèrement surélevée. */}
              <div
                className="flex w-fit max-w-full gap-1 self-start overflow-x-auto rounded-full bg-muted p-1"
                role="group"
                aria-label={t('stats.periodLabel')}
              >
                {STATS_PERIODS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => useStatsStore.getState().setPeriod(key)}
                    aria-pressed={period === key}
                    className={cn(
                      'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 font-display text-xs font-semibold transition-all',
                      period === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t(`stats.periods.${key}`)}
                  </button>
                ))}
              </div>
              {/* Mobile only: on desktop the three blocks are already stacked
                  on screen, so these would just scroll to what you can see. */}
              <div
                className="flex w-full gap-1 rounded-full bg-muted p-1 lg:hidden"
                role="group"
                aria-label={t('stats.blockLabel')}
              >
                {BLOCKS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBlock(key)}
                    aria-pressed={block === key}
                    className={cn(
                      'flex-1 rounded-full px-1.5 py-2 font-display text-[12.5px] font-semibold transition-all',
                      block === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t(`stats.blocks.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="container mx-auto max-w-5xl px-4 py-6">
        {loading && !stats ? (
          <p className="py-16 text-center text-sm text-mf-text-mute">{t('common.loading')}</p>
        ) : !stats ? (
          <p className="py-16 text-center text-sm text-mf-text-mute">{t('stats.loadError')}</p>
        ) : !stats.meta.hasAnyData ? (
          <EmptyState onAddItem={() => navigate('/products')} />
        ) : (
          <div className={cn('flex flex-col gap-6 lg:gap-8', loading && 'opacity-60')}>
            {stats.meta.isRecentHousehold && (
              <MascotNote>
                {t('stats.recentHousehold', { count: stats.meta.householdAgeDays })}
              </MascotNote>
            )}

            {/* Mobile shows one block at a time; desktop stacks all three and
                the tabs scroll to them. */}
            <div className={cn(block === 'waste' ? 'contents' : 'hidden lg:contents')}>
              <WasteBlock
                waste={stats.waste}
                trend={stats.trend}
                comparedTo={comparedTo}
                showTrends={showTrends}
                showTrendChart={!stats.meta.isRecentHousehold}
              />
            </div>
            <div className={cn(block === 'cooking' ? 'contents' : 'hidden lg:contents')}>
              <CookingBlock
                cooking={stats.cooking}
                comparedTo={comparedTo}
                showTrends={showTrends}
              />
            </div>
            <div className={cn(block === 'household' ? 'contents' : 'hidden lg:contents')}>
              <HouseholdBlock household={stats.household} />
            </div>
          </div>
        )}
      </main>

      <div className="lg:hidden">
        <BottomNavigation currentPage="more" />
      </div>
    </div>
  );
};

function EmptyState({ onAddItem }: { onAddItem: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <img
        src="/mascot/chef-happy.png"
        alt=""
        aria-hidden
        className="h-32 w-32 object-contain opacity-90 lg:h-44 lg:w-44"
      />
      <h2 className="m-0 font-display text-xl font-bold tracking-tight text-mf-text lg:text-2xl">
        {t('stats.empty.title')}
      </h2>
      <p className="m-0 max-w-md text-sm leading-relaxed text-mf-text-soft lg:text-[15px]">
        {t('stats.empty.subtitle')}
      </p>
      <Button variant="green" className="font-display font-bold" onClick={onAddItem}>
        {t('stats.empty.cta')}
      </Button>
    </div>
  );
}

export default Statistics;
