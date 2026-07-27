export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface ContributionDonutProps {
  title: string;
  segments: DonutSegment[];
  /** Unit shown under the centered total ("articles", "recettes"). */
  totalLabel: string;
  /** Accessible summary — the listing is the real content, the ring decorates it. */
  ariaLabel: string;
}

const SIZE = 118;
const RADIUS = 46;
const STROKE = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Visual breather between segments, in path units.
const GAP = 3;

/**
 * Per-member split of one contribution type. Segments are drawn in list order,
 * never sorted by size: this is a distribution, not a ranking.
 */
export function ContributionDonut({
  title,
  segments,
  totalLabel,
  ariaLabel,
}: ContributionDonutProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let offset = 0;
  const arcs = segments.map((segment) => {
    const length = total > 0 ? (segment.value / total) * CIRCUMFERENCE : 0;
    const drawn = Math.max(length - (segments.length > 1 ? GAP : 0), 0);
    const arc = {
      ...segment,
      dash: `${drawn.toFixed(2)} ${(CIRCUMFERENCE - drawn).toFixed(2)}`,
      offset: (-offset).toFixed(2),
    };
    offset += length;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="mf-eyebrow text-mf-text-mute">{title}</span>
      <div className="relative h-[118px] w-[118px] shrink-0 sm:h-[132px] sm:w-[132px]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label={ariaLabel}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--mf-night-elevated)"
            strokeWidth={STROKE}
          />
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {total > 0 &&
              arcs.map((arc) => (
                <circle
                  key={arc.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={STROKE}
                  strokeDasharray={arc.dash}
                  strokeDashoffset={arc.offset}
                />
              ))}
          </g>
        </svg>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-px"
        >
          <span className="font-display text-[25px] font-bold leading-none tracking-tight text-mf-text">
            {total}
          </span>
          <span className="font-display text-[10.5px] font-semibold leading-none text-mf-text-mute">
            {totalLabel}
          </span>
        </div>
      </div>
      <ul className="flex w-full flex-col gap-1.5">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: segment.color }}
            />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-mf-text-soft">
              {segment.label}
            </span>
            <span className="font-display text-[13px] font-bold text-mf-text">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
