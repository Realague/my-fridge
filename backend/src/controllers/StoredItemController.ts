import { Request, Response } from 'express';
import { StoredItemService } from '../services/StoredItemService';
import { CreateStoredItemDto, UpdateStoredItemDto, GetStoredItemsQueryDto } from '../types/ItemDto';
import { ApiResponse } from '../types/ApiResponse';
import { BadRequestError, NotFoundError } from '../errors/CustomErrors';
import { User } from '../models/User';

export class StoredItemController {
  private storedItemService: StoredItemService;

  constructor() {
    this.storedItemService = new StoredItemService();
  }

  async createStoredItem(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      const user = req.user as User;
      const userId = user?.id;

      if (!userId) {
        throw new BadRequestError('User not authenticated');
      }

      const createData: CreateStoredItemDto = {
        ...req.body,
        householdId,
        createdBy: userId,
      };

      const storedItem = await this.storedItemService.createStoredItem(createData);

      const response: ApiResponse = {
        success: true,
        message: 'Stored item created successfully',
        data: storedItem,
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(error instanceof BadRequestError ? 400 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create stored item',
      });
    }
  }

  async getStoredItems(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      
      if (!householdId) {
        throw new BadRequestError('Household ID is required');
      }

      const query: GetStoredItemsQueryDto = {
        householdId,
        storageAreaId: req.query.storageAreaId as string,
        itemId: req.query.itemId as string,
        search: req.query.search as string,
        isExpired: req.query.isExpired === 'true',
        isExpiringSoon: req.query.isExpiringSoon === 'true',
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await this.storedItemService.getStoredItems(query);

      const response: ApiResponse = {
        success: true,
        message: 'Stored items retrieved successfully',
        data: result,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve stored items',
      });
    }
  }

  async getStoredItemById(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params;

      if (!householdId || !id) {
        throw new BadRequestError('Household ID and item ID are required');
      }

      const storedItem = await this.storedItemService.getStoredItemById(id, householdId);

      if (!storedItem) {
        throw new NotFoundError('Stored item not found');
      }

      const response: ApiResponse = {
        success: true,
        message: 'Stored item retrieved successfully',
        data: storedItem,
      };

      res.json(response);
    } catch (error) {
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve stored item',
      });
    }
  }

  async getStoredItemsByStorageArea(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, storageAreaId } = req.params;

      if (!householdId || !storageAreaId) {
        throw new BadRequestError('Household ID and storage area ID are required');
      }

      const storedItems = await this.storedItemService.getStoredItemsByStorageArea(storageAreaId, householdId);

      const response: ApiResponse = {
        success: true,
        message: 'Stored items retrieved successfully',
        data: storedItems,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve stored items',
      });
    }
  }

  async getExpiringItems(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      
      if (!householdId) {
        throw new BadRequestError('Household ID is required');
      }
      
      const days = req.query.days ? parseInt(req.query.days as string) : 3;

      const storedItems = await this.storedItemService.getExpiringItems(householdId, days);

      const response: ApiResponse = {
        success: true,
        message: 'Expiring items retrieved successfully',
        data: storedItems,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve expiring items',
      });
    }
  }

  async getExpiredItems(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;

      if (!householdId) {
        throw new BadRequestError('Household ID is required');
      }

      const storedItems = await this.storedItemService.getExpiredItems(householdId);

      const response: ApiResponse = {
        success: true,
        message: 'Expired items retrieved successfully',
        data: storedItems,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve expired items',
      });
    }
  }

  async updateStoredItem(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params;
      
      if (!householdId || !id) {
        throw new BadRequestError('Household ID and item ID are required');
      }
      
      const updateData: UpdateStoredItemDto = req.body;

      const storedItem = await this.storedItemService.updateStoredItem(id, householdId, updateData);

      if (!storedItem) {
        throw new NotFoundError('Stored item not found');
      }

      const response: ApiResponse = {
        success: true,
        message: 'Stored item updated successfully',
        data: storedItem,
      };

      res.json(response);
    } catch (error) {
      const status =
        error instanceof NotFoundError ? 404 : error instanceof BadRequestError ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update stored item',
      });
    }
  }

  async deleteStoredItem(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params;

      if (!householdId || !id) {
        throw new BadRequestError('Household ID and item ID are required');
      }

      const deleted = await this.storedItemService.deleteStoredItem(id, householdId);

      if (!deleted) {
        throw new NotFoundError('Stored item not found');
      }

      const response: ApiResponse = {
        success: true,
        message: 'Stored item deleted successfully',
      };

      res.json(response);
    } catch (error) {
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete stored item',
      });
    }
  }

  async getTotalQuantityByItem(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, itemId } = req.params;

      if (!householdId || !itemId) {
        throw new BadRequestError('Household ID and item ID are required');
      }

      const totalQuantity = await this.storedItemService.getTotalQuantityByItem(itemId, householdId);

      const response: ApiResponse = {
        success: true,
        message: 'Total quantity retrieved successfully',
        data: { totalQuantity },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve total quantity',
      });
    }
  }
} 