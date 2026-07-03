import { Request, Response } from 'express';
import { ShoppingItemService } from '../services/ShoppingItemService';
import { StoredItemService } from '../services/StoredItemService';
import { CreateShoppingItemDto, UpdateShoppingItemDto, GetShoppingItemsQueryDto, BulkTransferToStorageDto } from '../types/ItemDto';
import { ShoppingItemStatus, SHOPPING_ITEM_STATUSES } from '../types/enums';

export class ShoppingItemController {
  private shoppingItemService: ShoppingItemService;

  constructor() {
    const storedItemService = new StoredItemService();
    this.shoppingItemService = new ShoppingItemService(undefined, undefined, undefined, storedItemService);
  }

  async createShoppingItem(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      if (!householdId) {
        res.status(400).json({
          success: false,
          error: 'Household ID is required',
        });
        return;
      }

      const createData: CreateShoppingItemDto = {
        ...req.body,
        quantity: Number(req.body.quantity),
        householdId,
        createdBy: user.id,
      };

      const result = await this.shoppingItemService.createShoppingItem(createData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in createShoppingItem:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async getShoppingItemById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.shoppingItemService.getShoppingItemById(id as string);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error in getShoppingItemById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async getShoppingItems(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;

      if (!householdId) {
        res.status(400).json({
          success: false,
          error: 'Household ID is required',
        });
        return;
      }

      const statusParam = req.query.status as string | undefined;
      const status = SHOPPING_ITEM_STATUSES.includes(statusParam as ShoppingItemStatus)
        ? (statusParam as ShoppingItemStatus)
        : undefined;

      const query: GetShoppingItemsQueryDto = {
        householdId,
        status,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await this.shoppingItemService.getShoppingItemsByHousehold(query);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in getShoppingItems:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async updateShoppingItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateShoppingItemDto = {
        ...req.body,
        quantity: req.body.quantity !== undefined ? Number(req.body.quantity) : undefined,
      };

      const result = await this.shoppingItemService.updateShoppingItem(id as string, updateData);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error in updateShoppingItem:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async deleteShoppingItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;


      const result = await this.shoppingItemService.deleteShoppingItem(id as string);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error in deleteShoppingItem:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async updateShoppingItemStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!SHOPPING_ITEM_STATUSES.includes(status as ShoppingItemStatus)) {
        res.status(400).json({
          success: false,
          error: `Invalid status. Expected one of: ${SHOPPING_ITEM_STATUSES.join(', ')}`,
        });
        return;
      }

      const result = await this.shoppingItemService.setShoppingItemStatus(
        id as string,
        status as ShoppingItemStatus
      );

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error in updateShoppingItemStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async bulkTransferToStorage(req: Request, res: Response): Promise<void> {
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

      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, error: 'Items array is required and must not be empty' });
        return;
      }

      for (const item of items) {
        if (!item.shoppingItemId || !item.storageAreaId) {
          res.status(400).json({ success: false, error: 'Each item must have shoppingItemId and storageAreaId' });
          return;
        }
      }

      const data: BulkTransferToStorageDto = {
        items,
        householdId,
        createdBy: user.id,
      };

      const result = await this.shoppingItemService.bulkTransferToStorage(data);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in bulkTransferToStorage:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async reorderItems(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      const { itemPriorities } = req.body;

      if (!householdId) {
        res.status(400).json({
          success: false,
          error: 'Household ID is required',
        });
        return;
      }

      if (!Array.isArray(itemPriorities)) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body. Expected itemPriorities array.',
        });
        return;
      }

      const result = await this.shoppingItemService.reorderItems(householdId, itemPriorities);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in reorderItems:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
} 