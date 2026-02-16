import { Request, Response } from 'express';
import { ItemMinimumService } from '../services/ItemMinimumService';
import { CreateItemMinimumDto, UpdateItemMinimumDto, GetItemMinimumsQueryDto } from '../types/ItemMinimumDto';
import { ApiResponse } from '../types/ApiResponse';
import { BadRequestError, NotFoundError } from '../errors/CustomErrors';
import { User } from '../models/User';

export class ItemMinimumController {
  private itemMinimumService: ItemMinimumService;

  constructor() {
    this.itemMinimumService = new ItemMinimumService();
  }

  async createItemMinimum(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      const user = req.user as User;
      const userId = user?.id;

      if (!userId) {
        throw new BadRequestError('User not authenticated');
      }

      const createData: CreateItemMinimumDto = {
        ...req.body,
        householdId,
        createdBy: userId,
      };

      const itemMinimum = await this.itemMinimumService.createItemMinimum(createData);

      const response: ApiResponse = {
        success: true,
        message: 'Item minimum created successfully',
        data: itemMinimum,
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(error instanceof BadRequestError ? 400 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create item minimum',
      });
    }
  }

  async getItemMinimums(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      
      if (!householdId) {
        throw new BadRequestError('Household ID is required');
      }

      const query: GetItemMinimumsQueryDto = {
        householdId,
        itemId: req.query.itemId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await this.itemMinimumService.getItemMinimums(query);

      const response: ApiResponse = {
        success: true,
        message: 'Item minimums retrieved successfully',
        data: result,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve item minimums',
      });
    }
  }

  async getItemMinimumById(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params;

      if (!householdId || !id) {
        throw new BadRequestError('Household ID and minimum ID are required');
      }

      const itemMinimum = await this.itemMinimumService.getItemMinimumById(id, householdId);

      if (!itemMinimum) {
        throw new NotFoundError('Item minimum not found');
      }

      const response: ApiResponse = {
        success: true,
        message: 'Item minimum retrieved successfully',
        data: itemMinimum,
      };

      res.json(response);
    } catch (error) {
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve item minimum',
      });
    }
  }

  async updateItemMinimum(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params;
      
      if (!householdId || !id) {
        throw new BadRequestError('Household ID and minimum ID are required');
      }
      
      const updateData: UpdateItemMinimumDto = req.body;

      const itemMinimum = await this.itemMinimumService.updateItemMinimum(id, householdId, updateData);

      if (!itemMinimum) {
        throw new NotFoundError('Item minimum not found');
      }

      const response: ApiResponse = {
        success: true,
        message: 'Item minimum updated successfully',
        data: itemMinimum,
      };

      res.json(response);
    } catch (error) {
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update item minimum',
      });
    }
  }

  async deleteItemMinimum(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params;

      if (!householdId || !id) {
        throw new BadRequestError('Household ID and minimum ID are required');
      }

      const deleted = await this.itemMinimumService.deleteItemMinimum(id, householdId);

      if (!deleted) {
        throw new NotFoundError('Item minimum not found');
      }

      const response: ApiResponse = {
        success: true,
        message: 'Item minimum deleted successfully',
      };

      res.json(response);
    } catch (error) {
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete item minimum',
      });
    }
  }

  async getLowStockItems(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;

      if (!householdId) {
        throw new BadRequestError('Household ID is required');
      }

      const lowStockItems = await this.itemMinimumService.getLowStockItems(householdId);

      const response: ApiResponse = {
        success: true,
        message: 'Low stock items retrieved successfully',
        data: lowStockItems,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve low stock items',
      });
    }
  }
}
