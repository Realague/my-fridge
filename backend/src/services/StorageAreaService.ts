import { StorageAreaRepository } from '../repositories/StorageAreaRepository';
import { HouseholdRepository } from '../repositories/HouseholdRepository';
import { CreateStorageAreaDto, UpdateStorageAreaDto, StorageAreaResponseDto } from '../types/StorageAreaDto';
import { ValidationError, NotFoundError, UnauthorizedError } from '../errors/CustomErrors';
import { StorageAreaType } from '../types/enums';

export interface StorageAreaQueryDto {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  type?: StorageAreaType;
}

export class StorageAreaService {
  constructor(
    private storageAreaRepository: StorageAreaRepository,
    private householdRepository: HouseholdRepository
  ) {}

  async getStorageAreas(householdId: string, userId: string, query?: StorageAreaQueryDto): Promise<any[]> {
    // Check if user has access to this household
    await this.validateHouseholdAccess(householdId, userId);

    // Get storage areas with filters
    const storageAreas = await this.storageAreaRepository.findByHouseholdId(householdId, {
      limit: query?.limit || 50,
      offset: query?.offset || 0,
      sortBy: query?.sortBy || 'name',
      sortOrder: query?.sortOrder || 'ASC'
    });

    // Filter by type if specified
    if (query?.type) {
      return storageAreas.filter(area => area.type === query.type);
    }

    return storageAreas;
  }

  async createStorageArea(householdId: string, userId: string, createDto: CreateStorageAreaDto): Promise<any> {
    // Validation
    this.validateCreateStorageAreaDto(createDto);

    // Check if user has access to this household
    await this.validateHouseholdAdminAccess(householdId, userId);

    // Business rules - limit storage areas per household
    const existingCount = await this.storageAreaRepository.countByHouseholdId(householdId);
    if (existingCount >= 20) {
      throw new ValidationError('Maximum storage area limit reached for this household');
    }

    // Create storage area
    const storageArea = await this.storageAreaRepository.create({
      name: createDto.name.trim(),
      emoji: createDto.emoji || '📦',
      type: createDto.type || StorageAreaType.OTHER,
      householdId: householdId
    });

    return storageArea;
  }

  async getStorageAreaById(householdId: string, storageAreaId: string, userId: string): Promise<any> {
    // Check if user has access to this household
    await this.validateHouseholdAccess(householdId, userId);

    const storageArea = await this.storageAreaRepository.findById(storageAreaId);
    if (!storageArea) {
      throw new NotFoundError('Storage area not found');
    }

    // Verify storage area belongs to the household
    if (storageArea.householdId !== householdId) {
      throw new NotFoundError('Storage area not found in this household');
    }

    return storageArea;
  }

  async updateStorageArea(householdId: string, storageAreaId: string, userId: string, updateDto: UpdateStorageAreaDto): Promise<any> {
    // Validation
    this.validateUpdateStorageAreaDto(updateDto);

    // Check if user has access to this household
    await this.validateHouseholdAdminAccess(householdId, userId);

    // Check if storage area exists and belongs to household
    const exists = await this.storageAreaRepository.exists(storageAreaId, householdId);
    if (!exists) {
      throw new NotFoundError('Storage area not found');
    }

    // Update storage area
    const updateData: any = {};
    if (updateDto.name !== undefined) {
      updateData.name = updateDto.name.trim();
    }
    if (updateDto.emoji !== undefined) {
      updateData.emoji = updateDto.emoji;
    }
    if (updateDto.type !== undefined) {
      updateData.type = updateDto.type;
    }

    await this.storageAreaRepository.update(storageAreaId, updateData);

    // Return updated storage area
    const updatedStorageArea = await this.storageAreaRepository.findById(storageAreaId);
    return updatedStorageArea;
  }

  async deleteStorageArea(householdId: string, storageAreaId: string, userId: string): Promise<void> {
    // Check if user has access to this household
    await this.validateHouseholdAdminAccess(householdId, userId);

    // Check if storage area exists and belongs to household
    const exists = await this.storageAreaRepository.exists(storageAreaId, householdId);
    if (!exists) {
      throw new NotFoundError('Storage area not found');
    }

    // TODO: Check if storage area has items before deleting
    // This would require a StorageItem repository when implemented

    // Delete storage area
    await this.storageAreaRepository.delete(storageAreaId);
  }

  private async validateHouseholdAccess(householdId: string, userId: string): Promise<void> {
    const household = await this.householdRepository.findById(householdId);
    if (!household) {
      throw new NotFoundError('Household not found');
    }

    const isMember = await this.householdRepository.isMember(householdId, userId);
    if (!isMember) {
      throw new UnauthorizedError('Access denied. You are not a member of this household.');
    }
  }

  private async validateHouseholdAdminAccess(householdId: string, userId: string): Promise<void> {
    const household = await this.householdRepository.findById(householdId);
    if (!household) {
      throw new NotFoundError('Household not found');
    }

    const isAdmin = await this.householdRepository.isAdmin(householdId, userId);
    if (!isAdmin) {
      throw new UnauthorizedError('Access denied. You are not an admin of this household.');
    }
  }

  private validateCreateStorageAreaDto(dto: CreateStorageAreaDto): void {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Storage area name is required');
    }

    if (dto.name.trim().length > 100) {
      throw new ValidationError('Storage area name must be 100 characters or less');
    }

    if (dto.emoji && dto.emoji.length > 10) {
      throw new ValidationError('Emoji must be 10 characters or less');
    }

    if (dto.type && !Object.values(StorageAreaType).includes(dto.type)) {
      throw new ValidationError('Invalid storage area type');
    }
  }

  private validateUpdateStorageAreaDto(dto: UpdateStorageAreaDto): void {
    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new ValidationError('Storage area name cannot be empty');
      }

      if (dto.name.trim().length > 100) {
        throw new ValidationError('Storage area name must be 100 characters or less');
      }
    }

    if (dto.emoji !== undefined && dto.emoji.length > 10) {
      throw new ValidationError('Emoji must be 10 characters or less');
    }

    if (dto.type && !Object.values(StorageAreaType).includes(dto.type)) {
      throw new ValidationError('Invalid storage area type');
    }
  }

  static transformToResponseDto(storageArea: any): StorageAreaResponseDto {
    return {
      id: storageArea.id,
      name: storageArea.name,
      emoji: storageArea.emoji,
      type: storageArea.type,
      householdId: storageArea.householdId,
      createdAt: storageArea.createdAt,
      updatedAt: storageArea.updatedAt,
    };
  }
} 