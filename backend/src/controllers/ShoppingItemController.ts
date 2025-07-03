import { Request, Response } from 'express';
import { ShoppingItemService } from '../services/ShoppingItemService';
import { StoredItemService } from '../services/StoredItemService';
import { CreateShoppingItemDto, UpdateShoppingItemDto, GetShoppingItemsQueryDto } from '../types/ItemDto';

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

      const query: GetShoppingItemsQueryDto = {
        householdId,
        completed: req.query.completed === 'true' ? true : req.query.completed === 'false' ? false : undefined,
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
      const updateData: UpdateShoppingItemDto = req.body;

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

  async toggleShoppingItemCompleted(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.shoppingItemService.toggleShoppingItemCompleted(id as string);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error in toggleShoppingItemCompleted:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async bulkUpdateCompleted(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      const { ids, completed } = req.body;

      if (!householdId) {
        res.status(400).json({
          success: false,
          error: 'Household ID is required',
        });
        return;
      }

      if (!Array.isArray(ids) || typeof completed !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'Invalid request body. Expected ids array and completed boolean.',
        });
        return;
      }

      const result = await this.shoppingItemService.bulkUpdateCompleted(ids, completed, householdId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in bulkUpdateCompleted:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async clearCompleted(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;

      if (!householdId) {
        res.status(400).json({
          success: false,
          error: 'Household ID is required',
        });
        return;
      }

      const result = await this.shoppingItemService.clearCompleted(householdId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in clearCompleted:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
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