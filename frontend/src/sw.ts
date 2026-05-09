/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  notificationId?: string;
  storedItemId?: string | null;
  storageAreaId?: string | null;
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: 'MyFridge', body: event.data.text() };
  }
  const { title, body, url, notificationId } = payload;
  event.waitUntil(
    self.registration.showNotification(title || 'MyFridge', {
      body: body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url, notificationId },
    })
  );
});

const withNotificationId = (rawUrl: string, notificationId: string | undefined): string => {
  if (!notificationId) return rawUrl;
  const [path, query = ''] = rawUrl.split('?');
  const params = new URLSearchParams(query);
  if (params.get('notificationId') === notificationId) return rawUrl;
  params.set('notificationId', notificationId);
  return `${path}?${params.toString()}`;
};

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const data = (event.notification.data || {}) as { url?: string; notificationId?: string };
  const url = withNotificationId(data.url || '/', data.notificationId);
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ('focus' in client) {
          await (client as WindowClient).focus();
          (client as WindowClient).navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string } | undefined;
  if (data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
