import { Leaf, LucideIcon, PackageX, TrendingDown, TrendingUp, Trash2, Utensils } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { computeAntiGaspi } from '@/utils/antiGaspi';
import type { StockExitStatsResult } from '@/services/stockExitService';

interface JournalSummaryProps {
  stats: StockExitStatsResult | null;
  /** Short label of the previous month for the "vs {mois}" delta (null = hide). */
  previousMonthLabel: string | null;
  loading?: boolean;
}

interface StatCardProps {
  icon: LucideIcon;
  iconClass: string;
  iconBgClass: string;
  value: number;
  label: string;
  /** Delta vs previous period; undefined hides the comparison. */
  delta?: number;
  /** Class for a positive delta / negative delta (favorability-driven). */
  positiveClass?: string;
  negativeClass?: string;
  neutralNote?: string;
  previousMonthLabel: string | null;
}

function StatCard({
  icon: Icon,
  iconClass,
  iconBgClass,
  value,
  label,
  delta,
  positiveClass = 'text-mf-green-deep',
  negativeClass = 'text-mf-text-mute',
  neutralNote,
  previousMonthLabel,
}: StatCardProps) {
  const { t } = useTranslation();
  const showDelta = delta !== undefined && previousMonthLabel !== null;
  const DeltaIcon = (delta ?? 0) >= 0 ? TrendingUp : TrendingDown;
  const deltaClass = (delta ?? 0) >= 0 ? positiveClass : negativeClass;
  const deltaSign = (delta ?? 0) > 0 ? '+' : '';

  return (
    <div className="mf-card flex flex-col gap-1 p-3 lg:gap-2 lg:p-[18px]">
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-[10px] lg:h-10 lg:w-10 lg:rounded-xl',
          iconBgClass,
          iconClass
        )}
      >
        <Icon className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden />
      </span>
      <div className="font-display text-2xl font-extrabold leading-none text-mf-text lg:text-[34px]">
        {value}
      </div>
      <div className="font-display text-[11px] font-bold text-mf-text-soft lg:text-[13px]">
        {label}
      </div>
      {showDelta ? (
        <div className={cn('hidden items-center gap-1 font-display text-xs font-bold lg:flex', deltaClass)}>
          <DeltaIcon className="h-3.5 w-3.5" aria-hidden />
          {t('stockExit.journal.summary.vsMonth', {
            delta: `${deltaSign}${delta}`,
            month: previousMonthLabel,
          })}
        </div>
      ) : neutralNote ? (
        <div className="hidden font-display text-xs font-semibold text-mf-text-mute lg:block">
          {neutralNote}
        </div>
      ) : null}
    </div>
  );
}

function AntiGaspiCard({ stats }: { stats: StockExitStatsResult | null }) {
  const { t } = useTranslation();
  const current = stats?.current ?? { consumed: 0, wasted: 0, removed: 0 };
  const { rate, consumedPct } = computeAntiGaspi(current.consumed, current.wasted);

  return (
    <div className="rounded-xl border border-mf-green/30 bg-gradient-to-br from-mf-green-soft to-mf-night-surface p-4 shadow-[var(--mf-shadow-1)] lg:p-[18px]">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-display text-xs font-bold text-mf-green-deep">
            {t('stockExit.journal.summary.antiGaspi')}
          </div>
          <div className="mt-1.5 font-display text-[40px] font-extrabold leading-none tracking-tight text-mf-green-deep">
            {rate === null ? '—' : rate}
            {rate === null ? null : <span className="text-[22px]">%</span>}
          </div>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mf-green text-white shadow-[0_4px_10px_rgba(43,182,115,.3)]">
          <Leaf className="h-5 w-5" aria-hidden />
        </span>
      </div>

      <div className="my-3 h-2.5 overflow-hidden rounded-full bg-mf-danger">
        <span
          className="block h-full rounded-l-full bg-mf-green"
          style={{ width: `${consumedPct}%` }}
        />
      </div>

      <div className="flex gap-4 font-display text-[11.5px] font-semibold text-mf-text-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-mf-green" />
          {t('stockExit.journal.summary.consumedLegend', { count: current.consumed })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-mf-danger" />
          {t('stockExit.journal.summary.wastedLegend', { count: current.wasted })}
        </span>
      </div>
    </div>
  );
}

/** The 4-card summary band. Counts reflect the selected period + member. */
export function JournalSummary({ stats, previousMonthLabel, loading }: JournalSummaryProps) {
  const { t } = useTranslation();
  const current = stats?.current ?? { consumed: 0, wasted: 0, removed: 0 };
  const previous = stats?.previous ?? null;

  const consumedDelta = previous ? current.consumed - previous.consumed : undefined;
  const wastedDelta = previous ? current.wasted - previous.wasted : undefined;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 lg:grid lg:grid-cols-[repeat(3,minmax(0,1fr))_1.4fr] lg:gap-3.5',
        loading && 'opacity-60'
      )}
      aria-busy={loading}
    >
      <div className="grid grid-cols-3 gap-2 lg:contents">
        <StatCard
          icon={Utensils}
          iconClass="text-mf-green-deep"
          iconBgClass="bg-mf-green-soft"
          value={current.consumed}
          label={t('stockExit.journal.summary.consumed')}
          delta={consumedDelta}
          positiveClass="text-mf-green-deep"
          negativeClass="text-mf-text-mute"
          previousMonthLabel={previousMonthLabel}
        />
        <StatCard
          icon={Trash2}
          iconClass="text-mf-danger"
          iconBgClass="bg-mf-danger-soft"
          value={current.wasted}
          label={t('stockExit.journal.summary.wasted')}
          delta={wastedDelta}
          positiveClass="text-mf-danger"
          negativeClass="text-mf-green-deep"
          previousMonthLabel={previousMonthLabel}
        />
        <StatCard
          icon={PackageX}
          iconClass="text-mf-text-soft"
          iconBgClass="bg-mf-night-elevated"
          value={current.removed}
          label={t('stockExit.journal.summary.removed')}
          neutralNote={t('stockExit.journal.summary.neutralExit')}
          previousMonthLabel={previousMonthLabel}
        />
      </div>

      <AntiGaspiCard stats={stats} />
    </div>
  );
}
