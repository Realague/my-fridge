import { useTranslation } from 'react-i18next';
import { ShieldCheck, Trash2 } from 'lucide-react';
import type { TrendPoint, WasteStats } from '@/services/statsService';
import { CategoryBars, type CategoryBar } from './CategoryBars';
import { TrendBadge } from './TrendBadge';
import { TrendChart } from './TrendChart';
import { categoryColor } from './statsColors';

interface WasteBlockProps {
  waste: WasteStats;
  trend: TrendPoint[];
  /** Month name for the trend badge, null when no comparison is possible. */
  comparedTo: string | null;
  /** Period-over-period badges — off when there is nothing to compare against. */
  showTrends: boolean;
  /**
   * Monthly evolution chart. Independent of {@link showTrends}: the running
   * year has no comparable previous window, but its history is still worth
   * plotting.
   */
  showTrendChart: boolean;
}

/** Bloc 1 — Anti-gaspillage. Factual counts, no € / CO₂ estimate (phase 1). */
export function WasteBlock({
  waste,
  trend,
  comparedTo,
  showTrends,
  showTrendChart,
}: WasteBlockProps) {
  const { t } = useTranslation();

  const categoryLabel = (category: string) =>
    t(`items.categories.${category}`, { defaultValue: t('items.categories.other') });

  const wasteBars: CategoryBar[] = waste.topWastedCategories.map((entry, index) => ({
    key: entry.category,
    label: categoryLabel(entry.category),
    value: String(entry.count),
    weight: entry.count,
    color: categoryColor(entry.category, index),
  }));

  const keepBars: CategoryBar[] = waste.averageKeepDays.map((entry) => ({
    key: entry.category,
    label: categoryLabel(entry.category),
    value: t('stats.waste.days', { count: entry.days }),
    weight: entry.days,
    color: 'var(--mf-info)',
  }));

  const topWasted = waste.topWastedCategories[0];
  const topKeep = waste.averageKeepDays[0];

  return (
    <section id="stats-waste" className="flex scroll-mt-4 flex-col gap-3.5">
      <header className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-mf-green-soft text-mf-green-deep"
        >
          <Trash2 className="h-[17px] w-[17px]" strokeWidth={2.3} />
        </span>
        <h2 className="m-0 font-display text-lg font-bold tracking-tight text-mf-text sm:text-xl">
          {t('stats.waste.title')}
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        <div className="col-span-2 flex flex-col gap-1.5 rounded-lg border border-mf-night-line bg-mf-night-surface p-4 lg:col-span-1">
          <span className="mf-eyebrow text-mf-text-mute">{t('stats.waste.usageRate')}</span>
          <span className="font-display text-[32px] font-bold leading-tight tracking-tight text-mf-green-deep">
            {waste.usageRate === null ? '—' : `${waste.usageRate} %`}
          </span>
          {showTrends && (
            <TrendBadge
              delta={waste.usageRateDelta}
              comparedTo={comparedTo}
              unit="points"
              className="self-start"
            />
          )}
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg border border-mf-night-line bg-mf-night-surface p-4">
          <span className="mf-eyebrow text-mf-text-mute">{t('stats.waste.consumed')}</span>
          <span className="font-display text-[32px] font-bold leading-tight tracking-tight text-mf-text">
            {waste.consumed}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg border border-mf-night-line bg-mf-night-surface p-4">
          <span className="mf-eyebrow text-mf-text-mute">{t('stats.waste.wasted')}</span>
          <span className="font-display text-[32px] font-bold leading-tight tracking-tight text-mf-danger">
            {waste.wasted}
          </span>
        </div>
        <div className="col-span-2 flex flex-col gap-1.5 rounded-lg bg-mf-green-soft p-4 lg:col-span-1">
          <span className="mf-eyebrow flex items-center gap-2 text-mf-green-deep">
            <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden />
            {t('stats.waste.saved')}
          </span>
          <span className="font-display text-[32px] font-bold leading-tight tracking-tight text-mf-green-deep">
            {waste.savedJustInTime}
          </span>
          <span className="text-[11.5px] font-medium leading-snug text-mf-green-deep/85">
            {t('stats.waste.savedCaption')}
          </span>
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-3">
        {showTrendChart && <TrendChart points={trend} />}
        <div className="flex flex-col gap-3 rounded-xl border border-mf-night-line bg-mf-night-surface p-[18px] sm:p-5">
          <div>
            <span className="mf-eyebrow text-mf-text-mute">{t('stats.waste.topWastedTitle')}</span>
            <p className="m-0 mt-1.5 text-sm font-medium leading-snug text-mf-text sm:text-[14.5px]">
              {topWasted
                ? t('stats.waste.topWastedInsight', {
                    category: categoryLabel(topWasted.category).toLowerCase(),
                    count: topWasted.count,
                  })
                : t('stats.waste.topWastedEmpty')}
            </p>
          </div>
          {wasteBars.length > 0 && <CategoryBars bars={wasteBars} />}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-mf-night-line bg-mf-night-surface p-[18px] sm:p-5">
        <div>
          <span className="mf-eyebrow text-mf-text-mute">{t('stats.waste.keepTitle')}</span>
          <p className="m-0 mt-1.5 text-sm font-medium leading-snug text-mf-text sm:text-[14.5px]">
            {topKeep
              ? t('stats.waste.keepInsight', {
                  category: categoryLabel(topKeep.category).toLowerCase(),
                  count: topKeep.days,
                })
              : t('stats.waste.keepEmpty')}
          </p>
        </div>
        {keepBars.length > 0 && (
          <CategoryBars
            bars={keepBars}
            valueClassName="w-9"
            className="lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-2.5"
          />
        )}
      </div>
    </section>
  );
}
