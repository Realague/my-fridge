import { Request, Response } from 'express';
import { StockExitService } from '../services/StockExitService';
import { ApiResponse } from '../types/ApiResponse';
import { BadRequestError, NotFoundError, ValidationError } from '../errors/CustomErrors';
import { User } from '../models/User';
import { StockExitType, STOCK_EXIT_TYPES } from '../types/enums';

// Parse an ISO date query param; throws on a malformed (but present) value.
function parseDateParam(value: unknown, name: string): Date | undefined {
  if (value === undefined || value === '') return undefined;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`Invalid date for "${name}"`);
  }
  return date;
}

function parseExitType(value: unknown): StockExitType | undefined {
  if (value === undefined || value === '' || value === 'all') return undefined;
  if (!STOCK_EXIT_TYPES.includes(value as StockExitType)) {
    throw new BadRequestError(`Invalid exit type: ${value}`);
  }
  return value as StockExitType;
}

export class StockExitController {
  private stockExitService: StockExitService;

  constructor() {
    this.stockExitService = new StockExitService();
  }

  async exitStoredItem(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params;
      const user = req.user as User;
      const userId = user?.id;

      if (!householdId || !id) {
        throw new BadRequestError('Household ID and stored item ID are required');
      }
      if (!userId) {
        throw new BadRequestError('User not authenticated');
      }

      const { type, quantity } = req.body ?? {};

      const result = await this.stockExitService.exitStoredItem(
        householdId,
        id,
        userId,
        type,
        quantity
      );

      const response: ApiResponse = {
        success: true,
        message: 'Stock exit recorded successfully',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to record stock exit');
    }
  }

  async undoExit(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, exitId } = req.params;

      if (!householdId || !exitId) {
        throw new BadRequestError('Household ID and exit ID are required');
      }

      const result = await this.stockExitService.undoExit(householdId, exitId);

      const response: ApiResponse = {
        success: true,
        message: 'Stock exit undone successfully',
        data: result,
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to undo stock exit');
    }
  }

  async listExits(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;

      if (!householdId) {
        throw new BadRequestError('Household ID is required');
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const exits = await this.stockExitService.listExits(householdId, {
        limit,
        offset,
        from: parseDateParam(req.query.from, 'from'),
        to: parseDateParam(req.query.to, 'to'),
        exitType: parseExitType(req.query.exitType),
        exitedBy: (req.query.exitedBy as string) || undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Stock exits retrieved successfully',
        data: exits,
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve stock exits');
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;

      if (!householdId) {
        throw new BadRequestError('Household ID is required');
      }

      const stats = await this.stockExitService.getStats(householdId, {
        from: parseDateParam(req.query.from, 'from'),
        to: parseDateParam(req.query.to, 'to'),
        previousFrom: parseDateParam(req.query.previousFrom, 'previousFrom'),
        previousTo: parseDateParam(req.query.previousTo, 'previousTo'),
        exitedBy: (req.query.exitedBy as string) || undefined,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Stock exit stats retrieved successfully',
        data: stats,
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error, 'Failed to retrieve stock exit stats');
    }
  }

  private handleError(res: Response, error: unknown, fallbackMessage: string): void {
    const status =
      error instanceof NotFoundError
        ? 404
        : error instanceof ValidationError || error instanceof BadRequestError
          ? 400
          : 500;
    res.status(status).json({
      success: false,
      message: error instanceof Error ? error.message : fallbackMessage,
    });
  }
}
