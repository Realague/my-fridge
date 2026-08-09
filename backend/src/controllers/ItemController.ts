import { Request, Response } from 'express';
import { ItemService } from '../services/ItemService';
import { CreateItemDto, UpdateItemDto, GetItemsQueryDto } from '../types/ItemDto';

export class ItemController {
  private itemService: ItemService;

  constructor() {
    this.itemService = new ItemService();
  }

  async createItem(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, ...itemData } = req.body;
      
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

      const createData: CreateItemDto = {
        ...itemData,
        createdBy: user.id,
        householdId: householdId,
      };

      const result = await this.itemService.createItem(createData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in createItem:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async getItemById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const householdId = req.query.householdId as string;
      
      const result = await this.itemService.getItemById(id as string, householdId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error in getItemById:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async getItems(req: Request, res: Response): Promise<void> {
    try {
      const query: GetItemsQueryDto = {
        search: req.query.search as string,
        householdId: req.query.householdId as string,
        language: req.query.language as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await this.itemService.getItems(query);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in getItems:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async searchItems(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
        return;
      }

      const query: GetItemsQueryDto = {
        search: req.query.search as string,
        householdId: user.selectedHouseholdId,
        language: req.query.language as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        personalized: req.query.personalized === 'true',
        userId: user.id,
      };

      if (!query.search) {
        res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
        return;
      }

      const result = await this.itemService.getItems(query);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in searchItems:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async getItemsByHousehold(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      
      if (!householdId) {
        res.status(400).json({
          success: false,
          error: 'Household ID is required',
        });
        return;
      }
      
      const result = await this.itemService.getItemsByHousehold(householdId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error in getItemsByHousehold:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateItemDto = req.body;
      const householdId = req.query.householdId as string;
      
      const result = await this.itemService.updateItem(id as string, updateData, householdId);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error in updateItem:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  async getRecipeCount(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const count = await this.itemService.getRecipeCount(id as string);
      res.json({ success: true, data: { count } });
    } catch (error) {
      console.error('Error in getRecipeCount:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  async deleteItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const householdId = req.query.householdId as string;
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
      
      const result = await this.itemService.deleteItem(id as string, householdId, user.id);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('Error in deleteItem:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
} 