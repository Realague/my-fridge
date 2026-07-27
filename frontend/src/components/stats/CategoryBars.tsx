import { cn } from '@/lib/utils';

export interface CategoryBar {
  key: string;
  label: string;
  /** Raw value, already formatted for display by the caller. */
  value: string;
  /** Bar length driver — the largest row fills the track. */
  weight: number;
  color: string;
  /** Optional rank prefix ("1", "2", "3") for the "top N" lists. */
  rank?: number;
}

interface CategoryBarsProps {
  bars: CategoryBar[];
  /** Width of the value column, which varies with "7" vs "12 j". */
  valueClassName?: string;
  className?: string;
}

/** Horizontal bar list shared by the waste / keep-time / dish-type insights. */
export function CategoryBars({ bars, valueClassName, className }: CategoryBarsProps) {
  const max = Math.max(...bars.map((b) => b.weight), 1);

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {bars.map((bar) => (
        <div key={bar.key} className="flex items-center gap-2.5">
          {bar.rank !== undefined && (
            <span className="w-4 shrink-0 font-display text-xs font-bold text-mf-text-mute">
              {bar.rank}
            </span>
          )}
          <span className="w-[92px] shrink-0 truncate text-xs font-medium text-mf-text-soft sm:w-[112px] sm:text-[12.5px]">
            {bar.label}
          </span>
          <span className="block h-2.5 flex-1 overflow-hidden rounded-full bg-mf-night-elevated">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max(4, Math.round((bar.weight / max) * 100))}%`, background: bar.color }}
            />
          </span>
          <span
            className={cn(
              'shrink-0 text-right font-display text-[13px] font-bold text-mf-text',
              valueClassName ?? 'w-7',
            )}
          >
            {bar.value}
          </span>
        </div>
      ))}
    </div>
  );
}
