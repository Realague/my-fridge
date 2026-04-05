import { useEffect, useRef } from 'react';
import { useTimerStore } from '@/stores/timerStore';
import { playTimerAlarm, showTimerNotification } from '@/utils/timerNotifications';

export function useTimerTick() {
  const isRunning = useTimerStore((s) => s.isRunning);
  const remainingSeconds = useTimerStore((s) => s.remainingSeconds);
  const completedAt = useTimerStore((s) => s.completedAt);
  const label = useTimerStore((s) => s.label);
  const tick = useTimerStore((s) => s.tick);
  const prevCompletedRef = useRef(completedAt);

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, remainingSeconds, tick]);

  // Fire notifications when timer completes
  useEffect(() => {
    if (completedAt && completedAt !== prevCompletedRef.current) {
      playTimerAlarm();
      showTimerNotification(label);
    }
    prevCompletedRef.current = completedAt;
  }, [completedAt, label]);
}
