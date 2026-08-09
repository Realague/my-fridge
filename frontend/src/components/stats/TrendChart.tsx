import { useTranslation } from 'react-i18next';
import { formatTrendMonth } from '@/utils/statsPeriods';
import type { TrendPoint } from '@/services/statsService';

interface TrendChartProps {
  points: TrendPoint[];
}

const WIDTH = 620;
const HEIGHT = 160;
const PAD_X = 18;
const PAD_Y = 16;

/**
 * "Évolution du taux d'utilisation" — monthly usage rate over the trend window.
 * Months without a single exit carry no rate and are skipped rather than
 * plotted as zero, which would invent a catastrophic month out of silence.
 */
export function TrendChart({ points }: TrendChartProps) {
  const { t, i18n } = useTranslation();

  const plotted = points
    .map((p, index) => ({ ...p, index }))
    .filter((p): p is TrendPoint & { index: number; usageRate: number } => p.usageRate !== null);

  if (plotted.length < 2) return null;

  const rates = plotted.map((p) => p.usageRate);
  const rawMin = Math.min(...rates);
  const rawMax = Math.max(...rates);
  // Breathe a little around the series so a flat-ish line isn't glued to an edge.
  const min = Math.max(0, Math.floor((rawMin - 5) / 5) * 5);
  const max = Math.min(100, Math.ceil((rawMax + 5) / 5) * 5);
  const span = max - min || 1;

  const step = points.length > 1 ? (WIDTH - PAD_X * 2) / (points.length - 1) : 0;
  const coords = plotted.map((p) => {
    const x = PAD_X + p.index * step;
    const y = HEIGHT - PAD_Y - ((p.usageRate - min) / span) * (HEIGHT - PAD_Y * 2);
    return { x, y, month: p.month, usageRate: p.usageRate };
  });

  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `M${coords[0].x.toFixed(1)},${HEIGHT - PAD_Y} L${coords
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' L')} L${coords[coords.length - 1].x.toFixed(1)},${HEIGHT - PAD_Y} Z`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-mf-night-line bg-mf-night-surface p-[18px] sm:p-5">
      <span className="mf-eyebrow text-mf-text-mute">{t('stats.waste.trendTitle')}</span>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        fill="none"
        className="h-auto w-full"
        role="img"
        aria-label={t('stats.waste.trendA11y', {
          first: coords[0].usageRate,
          last: coords[coords.length - 1].usageRate,
        })}
      >
        <path d={area} fill="var(--mf-green-soft)" opacity={0.6} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--mf-green)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c) => (
          <circle
            key={c.month}
            cx={c.x}
            cy={c.y}
            r={4.5}
            fill="var(--mf-night-surface)"
            stroke="var(--mf-green)"
            strokeWidth={3}
          />
        ))}
      </svg>
      <div className="flex justify-between px-0.5">
        {points.map((p) => (
          <span key={p.month} className="font-display text-[11px] font-semibold text-mf-text-mute">
            {formatTrendMonth(p.month, i18n.language)}
          </span>
        ))}
      </div>
    </div>
  );
}
