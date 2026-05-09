import webpush from 'web-push';
import { PushSubscriptionRepository } from '../repositories/PushSubscriptionRepository';

export interface PushSubscribeInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string | null;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  notificationId?: string;
  storedItemId?: string | null;
  storageAreaId?: string | null;
  url?: string;
}

export class PushNotificationService {
  private vapidConfigured = false;
  private vapidWarningLogged = false;

  constructor(private pushSubscriptionRepository: PushSubscriptionRepository) {}

  private ensureVapidConfigured(): boolean {
    if (this.vapidConfigured) return true;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@my-fridge.local';
    if (!publicKey || !privateKey) {
      if (!this.vapidWarningLogged) {
        console.warn(
          '[PushNotificationService] VAPID keys not configured (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing). Push notifications are disabled.'
        );
        this.vapidWarningLogged = true;
      }
      return false;
    }
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.vapidConfigured = true;
      return true;
    } catch (err) {
      console.error('[PushNotificationService] Failed to configure VAPID details', err);
      return false;
    }
  }

  getPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY || '';
  }

  async subscribe(userId: string, input: PushSubscribeInput): Promise<void> {
    await this.pushSubscriptionRepository.upsertByEndpoint({
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
    });
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.pushSubscriptionRepository.deleteByEndpointForUser(userId, endpoint);
  }

  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<void> {
    if (userIds.length === 0) return;
    if (!this.ensureVapidConfigured()) return; // no-op if VAPID not configured

    const subscriptions = await this.pushSubscriptionRepository.findByUserIds(userIds);
    if (subscriptions.length === 0) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body
          );
        } catch (err: any) {
          const statusCode = err?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Subscription is gone — clean it up.
            try {
              await this.pushSubscriptionRepository.deleteByEndpoint(sub.endpoint);
            } catch (cleanupErr) {
              console.error('[PushNotificationService] Failed to delete stale subscription', cleanupErr);
            }
          } else {
            console.error(
              `[PushNotificationService] Failed to send push to endpoint ${sub.endpoint.substring(0, 50)}...`,
              err?.message || err
            );
          }
        }
      })
    );
  }
}
