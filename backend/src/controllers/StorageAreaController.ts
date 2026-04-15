import { Request, Response } from 'express';
import { StorageAreaService, StorageAreaQueryDto } from '../services/StorageAreaService';
import { NotFoundError } from '../errors/CustomErrors';
import { ApiResponse } from '../types/ApiResponse';
import { CreateStorageAreaDto, UpdateStorageAreaDto, ReorderStorageAreasDto } from '../types/StorageAreaDto';

export class StorageAreaController {
  constructor(private storageAreaService: StorageAreaService) {}

  async getStorageAreas(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId;
      const query: StorageAreaQueryDto = req.query;
      
      if (!householdId) {
        throw new NotFoundError('Household not found');
      }

      const storageAreasData = await this.storageAreaService.getStorageAreas(householdId, userId, query);
      
      // Transform raw data to DTOs in controller
      const storageAreas = storageAreasData.map(StorageAreaService.transformToResponseDto);
      
      const response: ApiResponse = {
        success: true,
        data: storageAreas,
        message: 'Storage areas retrieved successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async createStorageArea(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId;
      const createDto: CreateStorageAreaDto = req.body;
      
      if (!householdId) {
        throw new NotFoundError('Household not found');
      }
      
      const storageAreaData = await this.storageAreaService.createStorageArea(householdId, userId, createDto);
      
      // Transform raw data to DTO in controller
      const storageArea = StorageAreaService.transformToResponseDto(storageAreaData);
      
      const response: ApiResponse = {
        success: true,
        data: storageArea,
        message: 'Storage area created successfully'
      };
      
      res.status(201).json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getStorageAreaById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId;
      const storageAreaId = req.params.id;

      if (!householdId) {
        throw new NotFoundError('Household not found');
      }

      if (!storageAreaId) {
        throw new NotFoundError('Storage area not found');
      }
      
      const storageAreaData = await this.storageAreaService.getStorageAreaById(householdId, storageAreaId, userId);
      
      // Transform raw data to DTO in controller
      const storageArea = StorageAreaService.transformToResponseDto(storageAreaData);
      
      const response: ApiResponse = {
        success: true,
        data: storageArea,
        message: 'Storage area retrieved successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateStorageArea(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId;
      const storageAreaId = req.params.id;
      const updateDto: UpdateStorageAreaDto = req.body;

      if (!householdId) {
        throw new NotFoundError('Household not found');
      }

      if (!storageAreaId) {
        throw new NotFoundError('Storage area not found');
      }
      
      const storageAreaData = await this.storageAreaService.updateStorageArea(householdId, storageAreaId, userId, updateDto);
      
      // Transform raw data to DTO in controller
      const storageArea = StorageAreaService.transformToResponseDto(storageAreaData);
      
      const response: ApiResponse = {
        success: true,
        data: storageArea,
        message: 'Storage area updated successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async reorderStorageAreas(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId;
      const reorderDto: ReorderStorageAreasDto = req.body;

      if (!householdId) {
        throw new NotFoundError('Household not found');
      }

      const storageAreas = await this.storageAreaService.reorderStorageAreas(householdId, userId, reorderDto);

      const response: ApiResponse = {
        success: true,
        data: storageAreas,
        message: 'Storage areas reordered successfully'
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async deleteStorageArea(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const householdId = req.params.householdId;
      const storageAreaId = req.params.id;

      if (!householdId) {
        throw new NotFoundError('Household not found');
      }

      if (!storageAreaId) {
        throw new NotFoundError('Storage area not found');
      }
      
      await this.storageAreaService.deleteStorageArea(householdId, storageAreaId, userId);
      
      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Storage area deleted successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any): void {
    console.error('StorageAreaController Error:', error);

    if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        message: error.message,
        data: null
      });
      return;
    }

    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: error.message || 'Validation failed',
        data: null
      });
      return;
    }

    if (error.name === 'UnauthorizedError') {
      res.status(403).json({
        success: false,
        message: error.message || 'Access denied',
        data: null
      });
      return;
    }

    // Default error response
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
} 