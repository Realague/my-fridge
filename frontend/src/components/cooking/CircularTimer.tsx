import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface CircularTimerProps {
  totalSeconds: number;
  remainingSeconds: number;
  size?: number;
  strokeWidth?: number;
  completed?: boolean;
  className?: string;
}

export function CircularTimer({
  totalSeconds,
  remainingSeconds,
  size = 64,
  strokeWidth = 4,
  completed = false,
  className,
}: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const offset = circumference * (1 - progress);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [remainingSeconds]);

  const strokeColor = completed
    ? 'stroke-destructive'
    : remainingSeconds <= 10
      ? 'stroke-destructive'
      : remainingSeconds <= 60
        ? 'stroke-yellow-500'
        : 'stroke-primary';

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {/* Progress arc */}
        {totalSeconds > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn('transition-[stroke-dashoffset] duration-1000 ease-linear', strokeColor)}
          />
        )}
      </svg>
      <span
        className={cn(
          'absolute font-mono font-bold tabular-nums',
          completed && 'animate-pulse text-destructive',
          size >= 80 ? 'text-lg' : size >= 64 ? 'text-sm' : 'text-xs',
        )}
      >
        {formattedTime}
      </span>
    </div>
  );
}
