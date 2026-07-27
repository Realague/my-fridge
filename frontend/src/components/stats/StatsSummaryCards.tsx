import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { useStatsStore } from '@/stores/statsStore';
import { SPARKLINE_POINTS } from '@/utils/statsPeriods';
import { Sparkline } from './Sparkline';
import { StatGauge } from './StatGauge';
import { TrendBadge } from './TrendBadge';

interface StatsSummaryCardsProps {
  householdId: string | null;
}

/**
 * The two dashboard cards, on purpose in two different shapes:
 *  - "Anti-gaspi" is a gauge (design variant B) — a rate reads naturally as a
 *    ring filling up.
 *  - "En cuisine" keeps the dominant figure + sparkline (variant A) — a count
 *    has no ceiling to fill against, so its story is the month-to-month line.
 *
 * Always the current month, never the period selected on the detail page.
 * Hidden entirely until the household has produced at least one figure — an
 * empty card would be noise on the dashboard, and the detail page owns the
 * empty state.
 */
export function StatsSummaryCards({ householdId }: StatsSummaryCardsProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const summary = useStatsStore((s) => s.summary);
  const loadSummary = useStatsStore((s) => s.loadSummary);

  useEffect(() => {
    if (householdId) loadSummary(householdId);
  }, [householdId, loadSummary]);

  if (!summary || !summary.meta.hasAnyData) return null;

  const monthName = (date: Date) =>
    new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(date);

  const now = new Date();
  const monthLabel = monthName(now);
  const comparedTo = summary.meta.comparisonAvailable
    ? monthName(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    : null;

  const { usageRate } = summary.waste;
  const cookedSeries = summary.trend.slice(-SPARKLINE_POINTS).map((p) => p.cookedCount);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
      <button
        type="button"
        onClick={() => navigate('/statistics?block=waste')}
        className="flex items-center gap-4 rounded-xl border border-mf-night-line bg-mf-night-surface p-4 text-left shadow-[0_1px_2px_rgba(20,15,5,0.05)] transition-colors hover:bg-mf-night-elevated lg:gap-[18px] lg:p-5"
      >
        <StatGauge
          percent={usageRate}
          label={usageRate === null ? '—' : `${usageRate}%`}
          color="var(--mf-green)"
          labelClassName="text-[23px] text-mf-green-deep lg:text-[29px]"
          className="h-[84px] w-[84px] lg:h-[104px] lg:w-[104px]"
          ariaLabel={t('stats.cards.waste.gaugeA11y', { value: usageRate ?? 0 })}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="mf-eyebrow text-mf-text-mute">
            {t('stats.cards.waste.title', { month: monthLabel })}
          </span>
          <span className="font-display text-base font-bold text-mf-text lg:text-[19px]">
            {t('stats.waste.usageRate')}
          </span>
          <span className="text-[12.5px] font-medium text-mf-text-soft lg:text-[13px]">
            {t('stats.cards.waste.caption', {
              consumed: summary.waste.consumed,
              wasted: summary.waste.wasted,
            })}
          </span>
          <TrendBadge
            delta={summary.waste.usageRateDelta}
            comparedTo={comparedTo}
            unit="points"
            className="self-start"
          />
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-mf-text-mute" aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => navigate('/statistics?block=cooking')}
        className="flex flex-col gap-2 rounded-xl border border-mf-night-line bg-mf-night-surface p-4 text-left shadow-[0_1px_2px_rgba(20,15,5,0.05)] transition-colors hover:bg-mf-night-elevated lg:gap-2.5 lg:p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="mf-eyebrow text-mf-text-mute">
            {t('stats.cards.cooking.title', { month: monthLabel })}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-mf-text-mute" aria-hidden />
        </div>
        <div className="flex flex-1 items-end justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
            <span className="font-display text-[46px] font-bold leading-[0.9] tracking-[-0.03em] text-mf-pink-deep lg:text-[56px]">
              {summary.cooking.cookedCount}
            </span>
            <TrendBadge delta={summary.cooking.cookedCountDelta} comparedTo={comparedTo} />
          </div>
          <Sparkline
            values={cookedSeries}
            stroke="var(--mf-pink)"
            fill="var(--mf-pink-soft)"
            className="h-10 w-[104px] shrink-0 lg:h-[46px] lg:w-[132px]"
          />
        </div>
        <p className="m-0 text-[13px] font-medium text-mf-text-soft lg:text-[13.5px]">
          {t('stats.cards.cooking.caption', { count: summary.cooking.distinctRecipes })}
        </p>
      </button>
    </div>
  );
}
