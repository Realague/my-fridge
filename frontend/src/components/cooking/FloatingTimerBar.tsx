import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, RotateCcw, Plus, Minus, Clock, X } from 'lucide-react';
import { useTimerStore } from '@/stores/timerStore';
import { CircularTimer } from './CircularTimer';
import { requestNotificationPermission } from '@/utils/timerNotifications';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function FloatingTimerBar() {
  const { t } = useTranslation();
  const {
    totalSeconds,
    remainingSeconds,
    isRunning,
    label,
    completedAt,
    start,
    pause,
    resume,
    reset,
    addTime,
    dismissCompleted,
  } = useTimerStore();

  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');

  const hasTimer = totalSeconds > 0;
  const isCompleted = completedAt != null;

  const handleStartCustom = () => {
    const mins = parseInt(customMinutes) || 0;
    const secs = parseInt(customSeconds) || 0;
    const total = mins * 60 + secs;
    if (total <= 0) return;

    requestNotificationPermission();
    start(total, { label: t('pages.recipes.customTimer') });
    setCustomMinutes('');
    setCustomSeconds('');
  };

  const handleToggle = () => {
    if (isRunning) {
      pause();
    } else {
      requestNotificationPermission();
      resume();
    }
  };

  const handleDismiss = () => {
    if (isCompleted) {
      dismissCompleted();
      reset();
    }
  };

  return (
    <Card
      className={cn(
        'sticky bottom-4 z-50 border shadow-xl transition-colors',
        isCompleted
          ? 'bg-destructive/10 border-destructive/30 animate-pulse'
          : 'bg-card/95 backdrop-blur-md border-border',
      )}
    >
      <CardContent className="p-3">
        {hasTimer ? (
          <div className="flex items-center gap-3">
            <CircularTimer
              totalSeconds={totalSeconds}
              remainingSeconds={remainingSeconds}
              completed={isCompleted}
              size={56}
              strokeWidth={4}
            />

            <div className="flex-1 min-w-0">
              {label && (
                <p className="text-xs text-muted-foreground truncate">{label}</p>
              )}
              {isCompleted ? (
                <p className="text-sm font-semibold text-destructive">
                  {t('pages.recipes.timerComplete')}
                </p>
              ) : (
                <p className="text-sm font-medium tabular-nums">
                  {formatTime(remainingSeconds)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!isCompleted && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => addTime(-60)}
                    disabled={remainingSeconds <= 60}
                    aria-label={t('a11y.timer.subtractMinute')}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => addTime(60)}
                    aria-label={t('a11y.timer.addMinute')}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleToggle}
                    aria-label={isRunning ? t('a11y.timer.pause') : t('a11y.timer.resume')}
                  >
                    {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                </>
              )}
              <Button
                variant={isCompleted ? 'destructive' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={isCompleted ? handleDismiss : reset}
                aria-label={isCompleted ? t('a11y.timer.dismiss') : t('a11y.timer.reset')}
              >
                {isCompleted ? <X className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground flex-shrink-0">
              {t('pages.recipes.noActiveTimer')}
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <Input
                type="number"
                min="0"
                placeholder="min"
                aria-label={t('a11y.timer.minutesInput')}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartCustom()}
                className="w-14 h-7 text-xs text-center"
              />
              <span className="text-muted-foreground text-xs" aria-hidden>:</span>
              <Input
                type="number"
                min="0"
                max="59"
                placeholder="sec"
                aria-label={t('a11y.timer.secondsInput')}
                value={customSeconds}
                onChange={(e) => setCustomSeconds(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartCustom()}
                className="w-14 h-7 text-xs text-center"
              />
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleStartCustom}>
                <Play className="h-3 w-3 mr-1" />
                {t('pages.recipes.startTimer')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
