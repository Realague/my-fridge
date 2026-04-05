import { Request, Response } from 'express';
import { LoyaltyCardService } from '../services/LoyaltyCardService';
import { CreateLoyaltyCardDto, UpdateLoyaltyCardDto, GetLoyaltyCardsQueryDto } from '../types/LoyaltyCardDto';
import { ApiResponse } from '../types/ApiResponse';
import { BadRequestError, NotFoundError } from '../errors/CustomErrors';
import { User } from '../models/User';

export class LoyaltyCardController {
  private loyaltyCardService: LoyaltyCardService;

  constructor() {
    this.loyaltyCardService = new LoyaltyCardService();
  }

  async createLoyaltyCard(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;
      const user = req.user as User;
      const userId = user?.id;

      if (!userId) {
        throw new BadRequestError('User not authenticated');
      }

      const createData: CreateLoyaltyCardDto = {
        ...req.body,
        householdId,
        createdBy: userId,
      };

      const loyaltyCard = await this.loyaltyCardService.createLoyaltyCard(createData);

      const response: ApiResponse = {
        success: true,
        message: 'Loyalty card created successfully',
        data: loyaltyCard,
      };

      res.status(201).json(response);
    } catch (error) {
      res.status(error instanceof BadRequestError ? 400 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create loyalty card',
      });
    }
  }

  async getLoyaltyCards(req: Request, res: Response): Promise<void> {
    try {
      const { householdId } = req.params;

      if (!householdId) {
        throw new BadRequestError('Household ID is required');
      }

      const query: GetLoyaltyCardsQueryDto = {
        householdId,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const result = await this.loyaltyCardService.getLoyaltyCards(query);

      const response: ApiResponse = {
        success: true,
        message: 'Loyalty cards retrieved successfully',
        data: result,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve loyalty cards',
      });
    }
  }

  async getLoyaltyCardById(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params;

      if (!householdId || !id) {
        throw new BadRequestError('Household ID and card ID are required');
      }

      const loyaltyCard = await this.loyaltyCardService.getLoyaltyCardById(id, householdId);

      if (!loyaltyCard) {
        throw new NotFoundError('Loyalty card not found');
      }

      const response: ApiResponse = {
        success: true,
        message: 'Loyalty card retrieved successfully',
        data: loyaltyCard,
      };

      res.json(response);
    } catch (error) {
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve loyalty card',
      });
    }
  }

  async updateLoyaltyCard(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params;

      if (!householdId || !id) {
        throw new BadRequestError('Household ID and card ID are required');
      }

      const updateData: UpdateLoyaltyCardDto = req.body;

      const loyaltyCard = await this.loyaltyCardService.updateLoyaltyCard(id, householdId, updateData);

      if (!loyaltyCard) {
        throw new NotFoundError('Loyalty card not found');
      }

      const response: ApiResponse = {
        success: true,
        message: 'Loyalty card updated successfully',
        data: loyaltyCard,
      };

      res.json(response);
    } catch (error) {
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update loyalty card',
      });
    }
  }

  async deleteLoyaltyCard(req: Request, res: Response): Promise<void> {
    try {
      const { householdId, id } = req.params;

      if (!householdId || !id) {
        throw new BadRequestError('Household ID and card ID are required');
      }

      const deleted = await this.loyaltyCardService.deleteLoyaltyCard(id, householdId);

      if (!deleted) {
        throw new NotFoundError('Loyalty card not found');
      }

      const response: ApiResponse = {
        success: true,
        message: 'Loyalty card deleted successfully',
      };

      res.json(response);
    } catch (error) {
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete loyalty card',
      });
    }
  }
}
