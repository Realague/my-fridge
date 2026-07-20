import { create } from 'zustand';
import { activityService, type ActivityEntry } from '@/services/activityService';

interface ActivityState {
  recent: ActivityEntry[];
  feed: ActivityEntry[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  loadRecent: (householdId: string) => Promise<void>;
  loadFeed: (householdId: string) => Promise<void>;
  loadMore: (householdId: string) => Promise<void>;
  reset: () => void;
}

const PAGE = 30;

export const useActivityStore = create<ActivityState>((set, get) => ({
  recent: [],
  feed: [],
  nextCursor: null,
  hasMore: false,
  loading: false,
  loadingMore: false,

  loadRecent: async (householdId) => {
    try {
      const entries = await activityService.getRecent(householdId, 5);
      set({ recent: entries });
    } catch (e) {
      console.error('loadRecent failed', e);
    }
  },

  loadFeed: async (householdId) => {
    set({ loading: true });
    try {
      const { entries, nextCursor } = await activityService.getFeed({ householdId, limit: PAGE });
      set({ feed: entries, nextCursor, hasMore: !!nextCursor, loading: false });
    } catch (e) {
      console.error('loadFeed failed', e);
      set({ loading: false });
    }
  },

  loadMore: async (householdId) => {
    const { nextCursor, loadingMore, feed } = get();
    if (!nextCursor || loadingMore) return;
    set({ loadingMore: true });
    try {
      const res = await activityService.getFeed({ householdId, limit: PAGE, before: nextCursor });
      set({
        feed: [...feed, ...res.entries],
        nextCursor: res.nextCursor,
        hasMore: !!res.nextCursor,
        loadingMore: false,
      });
    } catch (e) {
      console.error('loadMore failed', e);
      set({ loadingMore: false });
    }
  },

  reset: () => set({ feed: [], recent: [], nextCursor: null, hasMore: false }),
}));
