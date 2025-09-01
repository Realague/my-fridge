import { Request, Response } from 'express';
import { HouseholdService } from '../services/HouseholdService';
import { NotFoundError } from '../errors/CustomErrors';
import { ApiResponse } from '../types/ApiResponse';
import { CreateHouseholdDto, UpdateHouseholdDto, JoinHouseholdDto, HouseholdQueryDto } from '../types/HouseholdDto';
import { AuthService } from '../services/AuthService';

export class HouseholdController {
  constructor(private householdService: HouseholdService) {}

  async getHouseholds(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const query: HouseholdQueryDto = req.query;
      
      const householdsData = await this.householdService.getUserHouseholds(userId, query);
      
      // Transform raw data to DTOs in controller
      const households = householdsData.map(HouseholdService.transformToResponseDto);
      
      const response: ApiResponse = {
        success: true,
        data: households,
        message: 'Households retrieved successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async createHousehold(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const createDto: CreateHouseholdDto = req.body;
      
      const householdData = await this.householdService.createHousehold(userId, createDto);
      
      // Transform raw data to DTO in controller
      const household = HouseholdService.transformToResponseDto(householdData);

      // Auto-select the household and get updated user data
      const user = await this.householdService.selectHousehold(household.id, userId);
      
      let response: ApiResponse = {
        success: true,
        data: { household, user },
        message: 'Household created successfully'
      };
      
      res.status(201).json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getHouseholdById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.id;

      if (!householdId) {
        throw new NotFoundError('Household not found');
      }
      
      const householdData = await this.householdService.getHouseholdById(householdId, userId);
      
      // Transform raw data to DTO in controller
      const household = HouseholdService.transformToDetailResponseDto(householdData);
      
      const response: ApiResponse = {
        success: true,
        data: household,
        message: 'Household retrieved successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateHousehold(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.id;
      const updateDto: UpdateHouseholdDto = req.body;

      if (!householdId) {
        throw new NotFoundError('Household not found');
      }
      
      const householdData = await this.householdService.updateHousehold(householdId, userId, updateDto);
      
      // Transform raw data to DTO in controller
      const household = HouseholdService.transformToResponseDto(householdData);
      
      const response: ApiResponse = {
        success: true,
        data: household,
        message: 'Household updated successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async deleteHousehold(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.id;

      if (!householdId) {
        throw new NotFoundError('Household not found');
      }
      
      await this.householdService.deleteHousehold(householdId, userId);
      
      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Household deleted successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async joinHousehold(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const joinDto: JoinHouseholdDto = req.body;
      
      const householdData = await this.householdService.joinHousehold(userId, joinDto);
      
      // Transform raw data to DTO in controller
      const household = HouseholdService.transformToResponseDto(householdData);

      // Auto-select the household and get updated user data
      const user = await this.householdService.selectHousehold(household.id, userId);
      
      const response: ApiResponse = {
        success: true,
        data: { household, user },
        message: `Successfully joined ${household.name}`
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async leaveHousehold(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.id;

      if (!householdId) {
        throw new NotFoundError('Household not found');
      }
      
      await this.householdService.leaveHousehold(householdId, userId);
      
      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Successfully left the household'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async selectHousehold(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.id;

      if (!householdId) {
        throw new NotFoundError('Household not found');
      }
      
      const user = await this.householdService.selectHousehold(householdId, userId);
      
      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'Selected household updated successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any): void {
    console.error('Controller error:', error);
    
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details
      });
    } else if (error.name === 'NotFoundError') {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else if (error.name === 'UnauthorizedError') {
      res.status(403).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 