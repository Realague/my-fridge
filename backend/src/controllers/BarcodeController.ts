import { Request, Response } from 'express';
import { BarcodeService } from '../services/BarcodeService';

export class BarcodeController {
  private barcodeService: BarcodeService;

  constructor() {
    this.barcodeService = new BarcodeService();
  }

  /**
   * POST /api/households/:householdId/barcode/lookup
   * Body: { barcode: string }
   * Resolves a scanned barcode: catalog match, Open Food Facts product, or unknown.
   */
  async lookup(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      const { barcode } = req.body;

      if (!householdId) {
        res.status(400).json({ success: false, error: 'Household ID is required' });
        return;
      }
      if (!barcode || typeof barcode !== 'string') {
        res.status(400).json({ success: false, error: 'Barcode is required' });
        return;
      }

      const result = await this.barcodeService.lookup(householdId, barcode);

      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in barcode lookup:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /api/households/:householdId/barcode/confirm
   * Body: { barcode: string, itemId: string, format?: string }
   * Records/reinforces the global barcode → item mapping.
   */
  async confirm(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      const user = (req as any).user;
      const { barcode, itemId, format } = req.body;

      if (!householdId) {
        res.status(400).json({ success: false, error: 'Household ID is required' });
        return;
      }
      if (!barcode || !itemId) {
        res.status(400).json({ success: false, error: 'Barcode and itemId are required' });
        return;
      }

      const result = await this.barcodeService.confirmMapping(
        householdId,
        barcode,
        itemId,
        user?.id ?? null,
        typeof format === 'string' ? format : null
      );

      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error in barcode confirm:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
