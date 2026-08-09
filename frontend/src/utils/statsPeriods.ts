// Period math for the household statistics page. Same convention as the exit
// journal (cf. journalPeriods.ts): the frontend owns period semantics and hands
// the backend explicit ISO bounds, so everything stays in the user's timezone.

export type StatsPeriod = 'current_month' | 'last_month' | 'last_3_months' | 'current_year';

export const STATS_PERIODS: StatsPeriod[] = [
  'current_month',
  'last_month',
  'last_3_months',
  'current_year',
];

/** Number of monthly points in the "évolution du taux d'utilisation" chart. */
export const TREND_MONTHS = 7;

/** Points kept for the dashboard sparkline (tail of the trend series). */
export const SPARKLINE_POINTS = 6;

export interface StatsRange {
  /** Inclusive lower bound (ISO). */
  from: string;
  /** Exclusive upper bound (ISO). */
  to: string;
  /**
   * Previous comparable window. Only set for periods where a month-over-month
   * reading means something — never for "année en cours" (spec).
   */
  previousFrom?: string;
  previousTo?: string;
  /** Trend window: the last {@link TREND_MONTHS} calendar months up to now. */
  trendFrom: string;
  trendTo: string;
  /** First day of the compared window, for the "vs {mois}" label. */
  previousLabelDate: Date | null;
  /** Bounds as dates, for the "1 – 24 juillet 2026" subtitle. */
  displayFrom: Date;
  displayTo: Date;
}

const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth() + n, 1);
const startOfYear = (d: Date): Date => new Date(d.getFullYear(), 0, 1);
const endOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

/**
 * Resolve a period key to concrete bounds relative to `now` (local time).
 * Open-ended periods (current month/quarter/year) stop at the end of today so
 * the displayed range never advertises days that haven't happened yet.
 */
export function getStatsRange(period: StatsPeriod, now: Date = new Date()): StatsRange {
  const trendFrom = addMonths(startOfMonth(now), -(TREND_MONTHS - 1));
  const trendTo = addMonths(startOfMonth(now), 1);
  const trend = { trendFrom: trendFrom.toISOString(), trendTo: trendTo.toISOString() };

  switch (period) {
    case 'last_month': {
      const from = addMonths(startOfMonth(now), -1);
      const to = startOfMonth(now);
      const previousFrom = addMonths(from, -1);
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        previousFrom: previousFrom.toISOString(),
        previousTo: from.toISOString(),
        previousLabelDate: previousFrom,
        displayFrom: from,
        displayTo: new Date(to.getTime() - 1),
        ...trend,
      };
    }
    case 'last_3_months': {
      const from = addMonths(startOfMonth(now), -2);
      const to = endOfDay(now);
      const previousFrom = addMonths(from, -3);
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        previousFrom: previousFrom.toISOString(),
        previousTo: from.toISOString(),
        previousLabelDate: previousFrom,
        displayFrom: from,
        displayTo: now,
        ...trend,
      };
    }
    case 'current_year': {
      const from = startOfYear(now);
      const to = endOfDay(now);
      // No comparison for the running year: there is no comparable window.
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        previousLabelDate: null,
        displayFrom: from,
        displayTo: now,
        ...trend,
      };
    }
    case 'current_month':
    default: {
      const from = startOfMonth(now);
      const to = endOfDay(now);
      const previousFrom = addMonths(from, -1);
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        previousFrom: previousFrom.toISOString(),
        previousTo: from.toISOString(),
        previousLabelDate: previousFrom,
        displayFrom: from,
        displayTo: now,
        ...trend,
      };
    }
  }
}

/**
 * Human range for the page subtitle, e.g. "1 – 24 juillet 2026". Collapses the
 * month/year when both bounds share them.
 */
export function formatRangeLabel(range: StatsRange, locale: string): string {
  const { displayFrom, displayTo } = range;
  const sameYear = displayFrom.getFullYear() === displayTo.getFullYear();
  const sameMonth = sameYear && displayFrom.getMonth() === displayTo.getMonth();

  const day = new Intl.DateTimeFormat(locale, { day: 'numeric' });
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' });
  const full = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  if (sameMonth) return `${day.format(displayFrom)} – ${full.format(displayTo)}`;
  if (sameYear) return `${dayMonth.format(displayFrom)} – ${full.format(displayTo)}`;
  return `${full.format(displayFrom)} – ${full.format(displayTo)}`;
}

/** Short month label ("juil.") for a `YYYY-MM` trend key. */
export function formatTrendMonth(monthKey: string, locale: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, month - 1, 1));
}

/** Month name ("juin") used by the "vs {mois}" trend badges. */
export function formatComparisonLabel(date: Date | null, locale: string): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
}
