import { Request, Response } from 'express';
import { ItemSuggestionService } from '../services/ItemSuggestionService';

export class ItemSuggestionController {
  private itemSuggestionService: ItemSuggestionService;

  constructor() {
    this.itemSuggestionService = new ItemSuggestionService();
  }

  async getSuggestions(req: Request, res: Response): Promise<void> {
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

      const data = await this.itemSuggestionService.getSuggestions(householdId, user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error in getSuggestions:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
