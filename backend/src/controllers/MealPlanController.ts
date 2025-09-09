import { Request, Response } from 'express';
import { MealPlanService } from '../services/MealPlanService';
import { CreateMealPlanDto, UpdateMealPlanDto } from '../types/MealPlanDto';
import { ApiResponse } from '../types/ApiResponse';
import { ValidationError } from '../errors/CustomErrors';

export class MealPlanController {
  private mealPlanService: MealPlanService;

  constructor() {
    this.mealPlanService = new MealPlanService();
  }

  async createMealPlan(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params as { householdId: string };
      const mealPlanData: CreateMealPlanDto = req.body;

      const mealPlan = await this.mealPlanService.createMealPlan(householdId, mealPlanData);

      const response: ApiResponse<typeof mealPlan> = {
        success: true,
        data: mealPlan,
        message: 'Meal plan created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating meal plan:', error);
      res.status(error instanceof ValidationError ? 400 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create meal plan'
      });
    }
  }

  async getMealPlanById(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params as { householdId: string, id: string };

      const mealPlan = await this.mealPlanService.getMealPlanById(id, householdId);

      const response: ApiResponse<typeof mealPlan> = {
        success: true,
        data: mealPlan
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting meal plan by ID:', error);
      res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get meal plan'
      });
    }
  }

  async updateMealPlan(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params as { householdId: string, id: string };
      const updateData: UpdateMealPlanDto = req.body;

      const mealPlan = await this.mealPlanService.updateMealPlan(id, householdId, updateData);

      const response: ApiResponse<typeof mealPlan> = {
        success: true,
        data: mealPlan,
        message: 'Meal plan updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error updating meal plan:', error);
      res.status(error instanceof ValidationError ? 400 : 404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update meal plan'
      });
    }
  }

  async getMealPlansByDate(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params as { householdId: string };
      const { date } = req.query;

      if (!date || typeof date !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Date parameter is required'
        });
        return;
      }

      const mealPlans = await this.mealPlanService.getMealPlansByDate(householdId, date);

      const response: ApiResponse<typeof mealPlans> = {
        success: true,
        data: mealPlans
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting meal plans by date:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get meal plans'
      });
    }
  }

  async getMealPlansByDateRange(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params as { householdId: string };
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate parameters are required'
        });
        return;
      }

      const mealPlans = await this.mealPlanService.getMealPlansByDateRange(householdId, startDate, endDate);

      const response: ApiResponse<typeof mealPlans> = {
        success: true,
        data: mealPlans
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting meal plans by date range:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get meal plans'
      });
    }
  }

  async deleteMealPlan(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params as { householdId: string, id: string };

      await this.mealPlanService.deleteMealPlan(id, householdId);

      const response: ApiResponse<null> = {
        success: true,
        data: null,
        message: 'Meal plan deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete meal plan'
      });
    }
  }

  async generateShoppingList(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params as { householdId: string };
      const { startDate, endDate } = req.body;
      const userId = (req as any).user?.id;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const shoppingList = await this.mealPlanService.generateShoppingList(householdId, startDate, endDate, userId);

      const response: ApiResponse<typeof shoppingList> = {
        success: true,
        data: shoppingList,
        message: 'Shopping list generated and saved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Error generating shopping list:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate shopping list'
      });
    }
  }

  async getMealPlanStats(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params as { householdId: string };
      const { startDate, endDate } = req.query;

      const stats = await this.mealPlanService.getMealPlanStats(
        householdId,
        startDate as string,
        endDate as string
      );

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting meal plan stats:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get meal plan stats'
      });
    }
  }
} 