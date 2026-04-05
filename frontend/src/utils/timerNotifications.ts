let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function beep(ctx: AudioContext, frequency: number, startTime: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.3, startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playTimerAlarm() {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (browsers require user gesture)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;
  // Three ascending beeps
  beep(ctx, 880, now, 0.15);
  beep(ctx, 988, now + 0.2, 0.15);
  beep(ctx, 1108, now + 0.4, 0.3);
  // Repeat after a short pause
  beep(ctx, 880, now + 0.9, 0.15);
  beep(ctx, 988, now + 1.1, 0.15);
  beep(ctx, 1108, now + 1.3, 0.3);
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return Promise.resolve('denied' as NotificationPermission);
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  if (Notification.permission === 'denied') return Promise.resolve('denied');
  return Notification.requestPermission();
}

export function showTimerNotification(label: string | null) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    new Notification(label ? `Timer: ${label}` : 'Timer complete', {
      body: "Your cooking timer has finished!",
      icon: '/pwa-192x192.png',
      tag: 'cooking-timer',
    });
  } catch {
    // Notification constructor can fail in some environments
  }
}
