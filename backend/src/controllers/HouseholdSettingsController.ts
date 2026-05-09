import { Request, Response } from 'express';
import { HouseholdSettingsService } from '../services/HouseholdSettingsService';
import { ApiResponse } from '../types/ApiResponse';

export class HouseholdSettingsController {
  constructor(private settingsService: HouseholdSettingsService) {}

  async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId;

      const settings = await this.settingsService.getOrCreateForHousehold(householdId!, userId);

      const response: ApiResponse = {
        success: true,
        data: settings,
        message: 'Household settings retrieved successfully',
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId;
      const { expirationAlertDays } = req.body ?? {};

      const settings = await this.settingsService.updateForHousehold(householdId!, userId, {
        expirationAlertDays,
      });

      const response: ApiResponse = {
        success: true,
        data: settings,
        message: 'Household settings updated successfully',
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any): void {
    console.error('HouseholdSettingsController error:', error);
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
