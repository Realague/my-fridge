import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { pushSubscriptionService } from '@/services/pushSubscriptionService';
import {
  isPushSupported,
  getCurrentPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getActiveSubscription,
} from '@/utils/pushSubscription';

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface PushNotificationsStore {
  permission: PushPermissionState;
  subscribed: boolean;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;

  init: () => Promise<void>;
  enable: () => Promise<{ ok: boolean; reason?: 'denied' | 'error'; error?: string }>;
  disable: () => Promise<{ ok: boolean; error?: string }>;
}

const toPermissionState = (
  p: NotificationPermission | 'unsupported'
): PushPermissionState => {
  if (p === 'unsupported') return 'unsupported';
  return p;
};

export const usePushNotificationsStore = create<PushNotificationsStore>()(
  devtools(
    (set, get) => ({
      permission: 'default',
      subscribed: false,
      isLoading: false,
      error: null,
      initialized: false,

      init: async () => {
        if (get().initialized) return;
        if (!isPushSupported()) {
          set({ permission: 'unsupported', subscribed: false, initialized: true });
          return;
        }
        const permission = toPermissionState(getCurrentPermission());
        let subscribed = false;
        try {
          const sub = await getActiveSubscription();
          subscribed = !!sub;
        } catch {
          subscribed = false;
        }
        set({ permission, subscribed, initialized: true });
      },

      enable: async () => {
        if (!isPushSupported()) {
          set({ permission: 'unsupported' });
          return { ok: false, reason: 'error', error: 'unsupported' };
        }
        set({ isLoading: true, error: null });
        try {
          const publicKey = await pushSubscriptionService.getVapidPublicKey();
          if (!publicKey) {
            set({ isLoading: false, error: 'missing-vapid-key' });
            return { ok: false, reason: 'error', error: 'missing-vapid-key' };
          }
          const subscription = await subscribeToPush(publicKey);
          await pushSubscriptionService.registerSubscription(
            subscription,
            typeof navigator !== 'undefined' ? navigator.userAgent : undefined
          );
          set({
            subscribed: true,
            permission: toPermissionState(getCurrentPermission()),
            isLoading: false,
          });
          return { ok: true };
        } catch (err: any) {
          const message = String(err?.message ?? err ?? '');
          const isDenied = message.includes('denied') || getCurrentPermission() === 'denied';
          set({
            isLoading: false,
            error: message,
            permission: toPermissionState(getCurrentPermission()),
          });
          return { ok: false, reason: isDenied ? 'denied' : 'error', error: message };
        }
      },

      disable: async () => {
        if (!isPushSupported()) return { ok: true };
        set({ isLoading: true, error: null });
        try {
          const removed = await unsubscribeFromPush();
          if (removed?.endpoint) {
            try {
              await pushSubscriptionService.unregisterSubscription(removed.endpoint);
            } catch (err) {
              // Server-side unregister failures should not block local unsubscribe.
              console.warn('Failed to remove server-side push subscription', err);
            }
          }
          set({ subscribed: false, isLoading: false });
          return { ok: true };
        } catch (err: any) {
          const message = String(err?.message ?? err ?? '');
          set({ isLoading: false, error: message });
          return { ok: false, error: message };
        }
      },
    }),
    { name: 'push-notifications-store' }
  )
);
