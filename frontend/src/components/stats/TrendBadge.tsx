import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface TrendBadgeProps {
  /** Signed change vs the compared period. Null hides the badge entirely. */
  delta: number | null;
  /** Month name the comparison refers to ("juin"). Null hides the badge. */
  comparedTo: string | null;
  /** Percentage points ("+4 pts") rather than a raw count. */
  unit?: 'points' | 'count';
  className?: string;
}

/**
 * Trend pill on a stat. Green when the household improved, red when it slipped,
 * neutral when nothing moved — never shown when there is nothing to compare
 * against (new household, or a period with no comparable window).
 */
export function TrendBadge({ delta, comparedTo, unit = 'count', className }: TrendBadgeProps) {
  const { t } = useTranslation();
  if (delta === null || comparedTo === null) return null;

  const tone =
    delta > 0 ? 'mf-badge-green' : delta < 0 ? 'mf-badge-danger' : 'mf-badge-neutral';
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  const value =
    unit === 'points'
      ? t('stats.trend.points', { count: Math.abs(delta) })
      : String(Math.abs(delta));

  return (
    <span className={cn('mf-badge whitespace-nowrap', tone, className)}>
      {t('stats.trend.badge', { arrow, sign: delta > 0 ? '+' : delta < 0 ? '-' : '', value, month: comparedTo })}
    </span>
  );
}
