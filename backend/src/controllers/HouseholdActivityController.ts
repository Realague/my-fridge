import { Request, Response } from 'express';
import { HouseholdActivityFeedService } from '../services/HouseholdActivityFeedService';

export class HouseholdActivityController {
  private service: HouseholdActivityFeedService;

  constructor() {
    this.service = new HouseholdActivityFeedService();
  }

  async getFeed(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }
      if (!householdId) {
        res.status(400).json({ success: false, error: 'Household ID is required' });
        return;
      }

      const parsedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const limit = parsedLimit !== undefined && Number.isFinite(parsedLimit) ? parsedLimit : undefined;
      const before = (req.query.before as string) || undefined;

      const data = await this.service.getFeed(householdId, { limit, before });
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error in activities getFeed:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async getRecent(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }
      if (!householdId) {
        res.status(400).json({ success: false, error: 'Household ID is required' });
        return;
      }

      const parsedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
      const limit = Number.isFinite(parsedLimit) ? parsedLimit : 5;
      const data = await this.service.getRecent(householdId, limit);
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error in activities getRecent:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
