import { cn } from '@/lib/utils';

interface StatGaugeProps {
  /** Ring fill, 0–100. Clamped; null draws an empty track. */
  percent: number | null;
  /** Centered figure, already formatted ("86 %", "23"). */
  label: string;
  /** Progress stroke (CSS value). */
  color: string;
  /** Typography of the centered figure — it varies by card. */
  labelClassName?: string;
  /** Sizing of the wrapper. */
  className?: string;
  ariaLabel: string;
}

const SIZE = 84;
const RADIUS = 34;
const STROKE = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Progress ring behind the dashboard summary cards (design variant B). The
 * figure sits in an HTML overlay rather than SVG text so it inherits the app's
 * font stack and scales with the card.
 */
export function StatGauge({
  percent,
  label,
  color,
  labelClassName,
  className,
  ariaLabel,
}: StatGaugeProps) {
  const filled = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  const drawn = (filled / 100) * CIRCUMFERENCE;

  return (
    <div className={cn('relative shrink-0', className)}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-full w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--mf-night-elevated)"
          strokeWidth={STROKE}
        />
        {drawn > 0 && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${drawn.toFixed(2)} ${CIRCUMFERENCE.toFixed(2)}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        )}
      </svg>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span className={cn('font-display font-bold leading-none tracking-tight', labelClassName)}>
          {label}
        </span>
      </div>
    </div>
  );
}
