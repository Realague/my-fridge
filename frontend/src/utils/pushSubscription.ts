/**
 * Browser push subscription helpers.
 *
 * Wraps the Service Worker / PushManager APIs and exposes a small surface to
 * stores and components.
 */

export const isPushSupported = (): boolean => {
  return typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && typeof window !== 'undefined'
    && 'PushManager' in window
    && 'Notification' in window;
};

export const getCurrentPermission = (): NotificationPermission | 'unsupported' => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const getOrRegisterServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return await navigator.serviceWorker.register('/sw.js', { type: 'classic' });
};

export interface SerializedPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export const getActiveSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return await registration.pushManager.getSubscription();
};

export const subscribeToPush = async (
  vapidPublicKey: string
): Promise<SerializedPushSubscription> => {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported on this device.');
  }
  if (!vapidPublicKey) {
    throw new Error('VAPID public key is missing.');
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    throw new Error(`Notification permission ${permission}`);
  }

  const registration = await getOrRegisterServiceWorker();
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Subscription returned by the browser is incomplete.');
  }
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
};

export const unsubscribeFromPush = async (): Promise<{ endpoint: string } | null> => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return { endpoint };
};
