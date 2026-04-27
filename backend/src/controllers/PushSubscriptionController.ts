import { Request, Response } from 'express';
import { PushNotificationService } from '../services/PushNotificationService';
import { ApiResponse } from '../types/ApiResponse';

export class PushSubscriptionController {
  constructor(private pushService: PushNotificationService) {}

  async getVapidKey(_req: Request, res: Response): Promise<void> {
    try {
      const publicKey = this.pushService.getPublicKey();
      const response: ApiResponse = {
        success: true,
        data: { publicKey },
        message: 'VAPID public key retrieved successfully',
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const { endpoint, keys, userAgent } = req.body ?? {};

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        res.status(400).json({
          success: false,
          error: 'Invalid subscription payload. Expected { endpoint, keys: { p256dh, auth } }.',
        });
        return;
      }

      await this.pushService.subscribe(userId, {
        endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
        userAgent: userAgent ?? req.get('user-agent') ?? null,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Push subscription registered successfully',
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const { endpoint } = req.body ?? {};

      if (!endpoint) {
        res.status(400).json({
          success: false,
          error: 'Missing endpoint in request body.',
        });
        return;
      }

      await this.pushService.unsubscribe(userId, endpoint);

      const response: ApiResponse = {
        success: true,
        message: 'Push subscription removed successfully',
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any): void {
    console.error('PushSubscriptionController error:', error);
    if (error.name === 'ValidationError') {
      res.status(400).json({ success: false, error: error.message });
    } else if (error.name === 'NotFoundError') {
      res.status(404).json({ success: false, error: error.message });
    } else if (error.name === 'UnauthorizedError') {
      res.status(403).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
