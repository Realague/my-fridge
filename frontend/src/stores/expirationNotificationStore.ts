import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { notificationService } from '@/services/notificationService';
import {
  ExpirationNotification,
  ExpiringNowResponse,
} from '@/types/expirationNotification';

interface ExpirationNotificationStore {
  notifications: ExpirationNotification[];
  expiringNow: ExpiringNowResponse | null;
  loading: boolean;
  error: string | null;
  lastFetchedHouseholdId: string | null;

  fetchAll: (householdId: string) => Promise<void>;
  refreshNotifications: (householdId: string) => Promise<void>;
  refreshExpiringNow: (householdId: string) => Promise<void>;
  markRead: (householdId: string, notificationId: string) => Promise<void>;
  markAllRead: (householdId: string) => Promise<void>;
  removeOne: (householdId: string, notificationId: string) => Promise<void>;
  clearAll: (householdId: string) => Promise<void>;

  unreadCount: () => number;
  reset: () => void;
}

export const useExpirationNotificationStore = create<ExpirationNotificationStore>()(
  devtools(
    (set, get) => ({
      notifications: [],
      expiringNow: null,
      loading: false,
      error: null,
      lastFetchedHouseholdId: null,

      fetchAll: async (householdId: string) => {
        if (!householdId) return;
        set({ loading: true, error: null, lastFetchedHouseholdId: householdId });
        try {
          const [notifList, expiring] = await Promise.all([
            notificationService.list(householdId),
            notificationService.expiringNow(householdId),
          ]);
          set({
            notifications: notifList.notifications,
            expiringNow: expiring,
            loading: false,
          });
        } catch (error) {
          console.error('fetchAll notifications failed', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load notifications',
          });
        }
      },

      refreshNotifications: async (householdId: string) => {
        if (!householdId) return;
        try {
          const notifList = await notificationService.list(householdId);
          set({ notifications: notifList.notifications });
        } catch (error) {
          console.error('refreshNotifications failed', error);
        }
      },

      refreshExpiringNow: async (householdId: string) => {
        if (!householdId) return;
        try {
          const data = await notificationService.expiringNow(householdId);
          set({ expiringNow: data });
        } catch (error) {
          console.error('refreshExpiringNow failed', error);
        }
      },

      markRead: async (householdId: string, notificationId: string) => {
        const previous = get().notifications;
        set({
          notifications: previous.map((n) =>
            n.id === notificationId ? { ...n, readByCurrentUser: true } : n
          ),
        });
        try {
          await notificationService.markRead(householdId, notificationId);
        } catch (error) {
          console.error('markRead failed', error);
          set({ notifications: previous });
        }
      },

      markAllRead: async (householdId: string) => {
        const previous = get().notifications;
        set({
          notifications: previous.map((n) => ({ ...n, readByCurrentUser: true })),
        });
        try {
          await notificationService.markAllRead(householdId);
        } catch (error) {
          console.error('markAllRead failed', error);
          set({ notifications: previous });
        }
      },

      removeOne: async (householdId: string, notificationId: string) => {
        const previous = get().notifications;
        set({ notifications: previous.filter((n) => n.id !== notificationId) });
        try {
          await notificationService.delete(householdId, notificationId);
        } catch (error) {
          console.error('removeOne failed', error);
          set({ notifications: previous });
        }
      },

      clearAll: async (householdId: string) => {
        const previous = get().notifications;
        set({ notifications: [] });
        try {
          await notificationService.clearAll(householdId);
        } catch (error) {
          console.error('clearAll failed', error);
          set({ notifications: previous });
        }
      },

      unreadCount: () => get().notifications.filter((n) => !n.readByCurrentUser).length,

      reset: () =>
        set({
          notifications: [],
          expiringNow: null,
          loading: false,
          error: null,
          lastFetchedHouseholdId: null,
        }),
    }),
    { name: 'expirationNotificationStore' }
  )
);
