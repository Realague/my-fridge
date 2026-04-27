import { Request, Response } from 'express';
import { ExpirationNotificationService } from '../services/ExpirationNotificationService';
import { ApiResponse } from '../types/ApiResponse';

export class ExpirationNotificationController {
  constructor(private notificationService: ExpirationNotificationService) {}

  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId!;
      const data = await this.notificationService.getNotificationsForHousehold(householdId, userId);
      const response: ApiResponse = {
        success: true,
        data,
        message: 'Notifications retrieved successfully',
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async markRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId!;
      const notificationId = req.params.notificationId!;
      await this.notificationService.markRead(householdId, userId, notificationId);
      const response: ApiResponse = { success: true, data: null, message: 'Notification marked as read' };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId!;
      await this.notificationService.markAllRead(householdId, userId);
      const response: ApiResponse = { success: true, data: null, message: 'All notifications marked as read' };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId!;
      const notificationId = req.params.notificationId!;
      await this.notificationService.deleteNotification(householdId, userId, notificationId);
      const response: ApiResponse = { success: true, data: null, message: 'Notification deleted' };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async clearAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId!;
      await this.notificationService.clearAll(householdId, userId);
      const response: ApiResponse = { success: true, data: null, message: 'All notifications cleared' };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getExpiringNow(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId!;
      const data = await this.notificationService.getExpiringNow(householdId, userId);
      const response: ApiResponse = {
        success: true,
        data,
        message: 'Expiring items retrieved successfully',
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any): void {
    console.error('ExpirationNotificationController error:', error);
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
