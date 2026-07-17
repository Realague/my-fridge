// Period math for the Journal des sorties. The frontend owns period semantics
// and passes explicit ISO ranges to the backend (list + stats). Month-over-month
// comparison is only meaningful for whole-calendar-month periods, so only those
// carry a `previous*` range.

export type JournalPeriod = 'this_month' | 'last_month' | 'last_30_days' | 'all';

export const JOURNAL_PERIODS: JournalPeriod[] = [
  'this_month',
  'last_month',
  'last_30_days',
  'all',
];

export interface PeriodRange {
  /** Inclusive lower bound (ISO), undefined = no lower bound. */
  from?: string;
  /** Exclusive upper bound (ISO), undefined = up to now. */
  to?: string;
  /** Previous comparable month bounds (only for calendar-month periods). */
  previousFrom?: string;
  previousTo?: string;
  /** First day of the previous month, for the "vs {mois}" delta label. */
  previousMonthDate: Date | null;
  /** First day of the selected month, for a "{mois}" subtitle. Null otherwise. */
  monthDate: Date | null;
}

const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth() + n, 1);
const addDays = (d: Date, n: number): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/**
 * Resolve a period key to concrete ISO bounds relative to `now` (local time).
 */
export function getPeriodRange(period: JournalPeriod, now: Date): PeriodRange {
  switch (period) {
    case 'this_month': {
      const from = startOfMonth(now);
      const to = addMonths(from, 1);
      const prevFrom = addMonths(from, -1);
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        previousFrom: prevFrom.toISOString(),
        previousTo: from.toISOString(),
        previousMonthDate: prevFrom,
        monthDate: from,
      };
    }
    case 'last_month': {
      const to = startOfMonth(now);
      const from = addMonths(to, -1);
      const prevFrom = addMonths(from, -1);
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        previousFrom: prevFrom.toISOString(),
        previousTo: from.toISOString(),
        previousMonthDate: prevFrom,
        monthDate: from,
      };
    }
    case 'last_30_days': {
      const from = addDays(now, -30);
      return {
        from: from.toISOString(),
        to: undefined,
        previousMonthDate: null,
        monthDate: null,
      };
    }
    case 'all':
    default:
      return { previousMonthDate: null, monthDate: null };
  }
}
