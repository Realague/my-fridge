import { create } from 'zustand';
import {
  statsService,
  type HouseholdStats,
  type HouseholdStatsSummary,
} from '@/services/statsService';
import { getStatsRange, type StatsPeriod } from '@/utils/statsPeriods';

interface StatsState {
  /** Dashboard cards — always the current month, never the selected period. */
  summary: HouseholdStatsSummary | null;
  summaryLoading: boolean;
  /** Detail page, for the currently selected period. */
  stats: HouseholdStats | null;
  loading: boolean;
  error: string | null;
  period: StatsPeriod;
  setPeriod: (period: StatsPeriod) => void;
  loadSummary: (householdId: string) => Promise<void>;
  loadStats: (householdId: string, period: StatsPeriod) => Promise<void>;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  summary: null,
  summaryLoading: false,
  stats: null,
  loading: false,
  error: null,
  period: 'current_month',

  setPeriod: (period) => set({ period }),

  loadSummary: async (householdId) => {
    set({ summaryLoading: true });
    try {
      const summary = await statsService.getSummary(householdId, getStatsRange('current_month'));
      set({ summary, summaryLoading: false });
    } catch (e) {
      // The dashboard cards hide themselves on failure rather than shouting:
      // they are a glance, not a critical path.
      console.error('loadSummary failed', e);
      set({ summaryLoading: false });
    }
  },

  loadStats: async (householdId, period) => {
    set({ loading: true, period });
    try {
      const stats = await statsService.getStats(householdId, getStatsRange(period));
      // Ignore a response that lost the race against a newer period switch.
      if (get().period !== period) return;
      set({ stats, loading: false, error: null });
    } catch (e) {
      console.error('loadStats failed', e);
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load statistics',
      });
    }
  },

  setError: (error) => set({ error }),

  reset: () => set({ summary: null, stats: null, error: null, period: 'current_month' }),
}));
