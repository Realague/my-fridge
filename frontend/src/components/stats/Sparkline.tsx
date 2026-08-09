interface SparklineProps {
  /** Series to draw, oldest first. Nulls are gaps and are dropped. */
  values: Array<number | null>;
  /** Stroke + endpoint color (CSS value). */
  stroke: string;
  /** Area fill under the line (CSS value). */
  fill: string;
  className?: string;
}

const WIDTH = 120;
const HEIGHT = 40;
const PAD = 5;

/**
 * Compact trend line for the dashboard cards. Renders nothing below two points
 * — a single dot reads as data where there is none.
 */
export function Sparkline({ values, stroke, fill, className }: SparklineProps) {
  const points = values.filter((v): v is number => v !== null);
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  // A flat series would divide by zero; draw it as a centered line instead.
  const span = max - min || 1;
  const step = (WIDTH - PAD * 2) / (points.length - 1);

  const coords = points.map((value, i) => {
    const x = PAD + i * step;
    const y =
      max === min ? HEIGHT / 2 : HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2);
    return [x, y] as const;
  });

  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `M${PAD},${HEIGHT - PAD} L${coords
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' L')} L${WIDTH - PAD},${HEIGHT - PAD} Z`;
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} fill="none" aria-hidden className={className}>
      <path d={area} fill={fill} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r={3.4}
        fill={stroke}
        stroke="var(--mf-night-surface)"
        strokeWidth={2}
      />
    </svg>
  );
}
