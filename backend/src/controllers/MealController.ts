import { Request, Response } from 'express';
import { MealService } from '../services/MealService';
import {
  CreateMealDto,
  UpdateMealDto,
  CommitShoppingItemInputDto,
  MealRemovalActionDto,
} from '../types/MealDto';
import { ApiResponse } from '../types/ApiResponse';
import { NotFoundError, ValidationError } from '../errors/CustomErrors';

export class MealController {
  private mealService: MealService;

  constructor() {
    this.mealService = new MealService();
  }

  async getMeals(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params as { householdId: string };
      const meals = await this.mealService.getMeals(householdId);
      const response: ApiResponse<typeof meals> = { success: true, data: meals };
      res.json(response);
    } catch (error) {
      console.error('Error getting meals:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get meals',
      });
    }
  }

  async createMeal(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params as { householdId: string };
      const data: CreateMealDto = req.body;
      const meal = await this.mealService.createMeal(householdId, data);
      const response: ApiResponse<typeof meal> = {
        success: true,
        data: meal,
        message: 'Meal added',
      };
      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating meal:', error);
      const status = this.statusFromError(error);
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create meal',
      });
    }
  }

  async updateMeal(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params as { householdId: string; id: string };
      const data: UpdateMealDto = req.body;
      const meal = await this.mealService.updateMeal(id, householdId, data);
      const response: ApiResponse<typeof meal> = {
        success: true,
        data: meal,
        message: 'Meal updated',
      };
      res.json(response);
    } catch (error) {
      console.error('Error updating meal:', error);
      const status = this.statusFromError(error);
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update meal',
      });
    }
  }

  async deleteMeal(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params as { householdId: string; id: string };
      await this.mealService.deleteMeal(id, householdId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting meal:', error);
      const status = this.statusFromError(error);
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete meal',
      });
    }
  }

  async getAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params as { householdId: string };
      const availability = await this.mealService.getAvailability(householdId);
      const response: ApiResponse<typeof availability> = { success: true, data: availability };
      res.json(response);
    } catch (error) {
      console.error('Error getting meals availability:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get availability',
      });
    }
  }

  async getShoppingPreview(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params as { householdId: string };
      const preview = await this.mealService.getShoppingPreview(householdId);
      const response: ApiResponse<typeof preview> = { success: true, data: preview };
      res.json(response);
    } catch (error) {
      console.error('Error getting shopping preview:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get shopping preview',
      });
    }
  }

  /**
   * Legacy auto-commit endpoint kept so cached PWA clients (which still hit
   * `/meals/shopping-list` or `/meal-plans/(generate-)shopping-list`) don't
   * get a 404. Auto-commits the full preview without showing the recap.
   */
  async legacyAutoCommit(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params as { householdId: string };
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'User authentication required' });
        return;
      }
      const result = await this.mealService.autoCommitFromPreview(householdId, userId);
      const list = [...result.newItems, ...result.mergedItems];
      const response: ApiResponse<typeof list> = {
        success: true,
        data: list,
        message: 'Shopping list generated (legacy)',
      };
      res.json(response);
    } catch (error) {
      console.error('Error in legacy auto-commit:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate shopping list',
      });
    }
  }

  async commitShopping(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params as { householdId: string };
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'User authentication required' });
        return;
      }
      const { items } = (req.body ?? {}) as { items?: CommitShoppingItemInputDto[] };
      const result = await this.mealService.commitShopping(householdId, userId, items ?? []);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: 'Shopping list updated',
      };
      res.json(response);
    } catch (error) {
      console.error('Error committing shopping list:', error);
      const status = this.statusFromError(error);
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to commit shopping list',
      });
    }
  }

  async getRemovalImpact(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params as { householdId: string; id: string };
      const impact = await this.mealService.getRemovalImpact(id, householdId);
      const response: ApiResponse<typeof impact> = { success: true, data: impact };
      res.json(response);
    } catch (error) {
      console.error('Error getting removal impact:', error);
      const status = this.statusFromError(error);
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get removal impact',
      });
    }
  }

  async markCooked(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params as { householdId: string; id: string };
      const meal = await this.mealService.markMealCooked(id, householdId);
      const response: ApiResponse<typeof meal> = {
        success: true,
        data: meal,
        message: 'Meal marked as cooked',
      };
      res.json(response);
    } catch (error) {
      console.error('Error marking meal as cooked:', error);
      const status = this.statusFromError(error);
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to mark meal as cooked',
      });
    }
  }

  async confirmRemoval(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params as { householdId: string; id: string };
      const { actions } = (req.body ?? {}) as { actions?: MealRemovalActionDto[] };
      await this.mealService.confirmRemoval(id, householdId, actions ?? []);
      res.status(204).send();
    } catch (error) {
      console.error('Error confirming meal removal:', error);
      const status = this.statusFromError(error);
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove meal',
      });
    }
  }

  private statusFromError(error: unknown): number {
    if (error instanceof ValidationError) return 400;
    if (error instanceof NotFoundError) return 404;
    return 500;
  }
}
