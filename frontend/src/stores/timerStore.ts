import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSafeStorage } from '@/utils/safeStorage';

interface TimerState {
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  label: string | null;
  recipeId: string | null;
  stepIndex: number | null;
  completedAt: number | null;
  lastTickAt: number | null;

  start: (seconds: number, opts?: { label?: string; recipeId?: string; stepIndex?: number }) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: () => void;
  addTime: (seconds: number) => void;
  dismissCompleted: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      totalSeconds: 0,
      remainingSeconds: 0,
      isRunning: false,
      label: null,
      recipeId: null,
      stepIndex: null,
      completedAt: null,
      lastTickAt: null,

      start: (seconds, opts) => {
        set({
          totalSeconds: seconds,
          remainingSeconds: seconds,
          isRunning: true,
          label: opts?.label ?? null,
          recipeId: opts?.recipeId ?? null,
          stepIndex: opts?.stepIndex ?? null,
          completedAt: null,
          lastTickAt: Date.now(),
        });
      },

      pause: () => {
        set({ isRunning: false });
      },

      resume: () => {
        set({ isRunning: true, lastTickAt: Date.now() });
      },

      reset: () => {
        set({
          totalSeconds: 0,
          remainingSeconds: 0,
          isRunning: false,
          label: null,
          recipeId: null,
          stepIndex: null,
          completedAt: null,
          lastTickAt: null,
        });
      },

      tick: () => {
        const { remainingSeconds, isRunning } = get();
        if (!isRunning || remainingSeconds <= 0) return;

        const newRemaining = remainingSeconds - 1;
        if (newRemaining <= 0) {
          set({
            remainingSeconds: 0,
            isRunning: false,
            completedAt: Date.now(),
            lastTickAt: Date.now(),
          });
        } else {
          set({ remainingSeconds: newRemaining, lastTickAt: Date.now() });
        }
      },

      addTime: (seconds) => {
        const { remainingSeconds, totalSeconds } = get();
        set({
          remainingSeconds: remainingSeconds + seconds,
          totalSeconds: totalSeconds + seconds,
        });
      },

      dismissCompleted: () => {
        set({ completedAt: null });
      },
    }),
    {
      name: 'myfridge-timer',
      storage: createJSONStorage(() => getSafeStorage()),
      partialize: (state) => ({
        totalSeconds: state.totalSeconds,
        remainingSeconds: state.remainingSeconds,
        isRunning: state.isRunning,
        label: state.label,
        recipeId: state.recipeId,
        stepIndex: state.stepIndex,
        completedAt: state.completedAt,
        lastTickAt: state.lastTickAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // If the timer was running when the page was closed, account for elapsed time
        if (state.isRunning && state.lastTickAt && state.remainingSeconds > 0) {
          const elapsed = Math.floor((Date.now() - state.lastTickAt) / 1000);
          const newRemaining = Math.max(0, state.remainingSeconds - elapsed);
          state.remainingSeconds = newRemaining;
          if (newRemaining <= 0) {
            state.isRunning = false;
            state.completedAt = Date.now();
          }
          state.lastTickAt = Date.now();
        }
      },
    }
  )
);
