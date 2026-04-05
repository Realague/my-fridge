import { StoredItemRepository } from '../repositories/StoredItemRepository';
import { CreateStoredItemDto, UpdateStoredItemDto, GetStoredItemsQueryDto, StoredItemDto } from '../types/ItemDto';
import { StoredItem } from '../models/StoredItem';
import { StorageArea } from '../models/StorageArea';
import { StorageAreaType } from '../types/enums';

export class StoredItemService {
  private storedItemRepository: StoredItemRepository;

  constructor() {
    this.storedItemRepository = new StoredItemRepository();
  }

  async createStoredItem(data: CreateStoredItemDto): Promise<StoredItemDto> {
    // Check if storage area is freezer type and set frozenDate accordingly
    const storageArea = await StorageArea.findByPk(data.storageAreaId);
    const createData = {
      ...data,
      frozenDate: storageArea?.type === StorageAreaType.FREEZER 
        ? new Date().toISOString().split('T')[0] 
        : undefined,
    };
    
    const storedItem = await this.storedItemRepository.create(createData);
    return this.mapToDto(storedItem);
  }

  async getStoredItemById(id: string, householdId: string): Promise<StoredItemDto | null> {
    const storedItem = await this.storedItemRepository.findById(id, householdId);
    return storedItem ? this.mapToDto(storedItem) : null;
  }

  async getStoredItems(query: GetStoredItemsQueryDto): Promise<{ items: StoredItemDto[]; total: number }> {
    const { items, total } = await this.storedItemRepository.findAll(query);
    return {
      items: items.map(item => this.mapToDto(item)),
      total,
    };
  }

  async getStoredItemsByStorageArea(storageAreaId: string, householdId: string): Promise<StoredItemDto[]> {
    const storedItems = await this.storedItemRepository.findByStorageArea(storageAreaId, householdId);
    return storedItems.map(item => this.mapToDto(item));
  }

  async getExpiringItems(householdId: string, days: number = 3): Promise<StoredItemDto[]> {
    const storedItems = await this.storedItemRepository.findExpiring(householdId, days);
    return storedItems.map(item => this.mapToDto(item));
  }

  async getExpiredItems(householdId: string): Promise<StoredItemDto[]> {
    const storedItems = await this.storedItemRepository.findExpired(householdId);
    return storedItems.map(item => this.mapToDto(item));
  }

  async updateStoredItem(id: string, householdId: string, data: UpdateStoredItemDto): Promise<StoredItemDto | null> {
    // Get current stored item to check current storage area
    const currentItem = await this.storedItemRepository.findById(id, householdId);
    if (!currentItem) return null;

    const updateData: UpdateStoredItemDto = { ...data };

    // Handle storage area change and frozenDate logic
    if (data.storageAreaId && data.storageAreaId !== currentItem.storageAreaId) {
      // Storage area is being changed
      const newStorageArea = await StorageArea.findByPk(data.storageAreaId);
      const currentStorageArea = await StorageArea.findByPk(currentItem.storageAreaId);

      // If moving TO freezer, set frozenDate to today
      if (newStorageArea?.type === StorageAreaType.FREEZER) {
        currentItem.frozenDate = new Date();
      }
      // If moving FROM freezer, clear frozenDate
      else if (currentStorageArea?.type === StorageAreaType.FREEZER) {
        currentItem.frozenDate = null;
      }
    }

    const storedItem = await this.storedItemRepository.update(id, householdId, updateData);
    return storedItem ? this.mapToDto(storedItem) : null;
  }

  async deleteStoredItem(id: string, householdId: string): Promise<boolean> {
    return await this.storedItemRepository.delete(id, householdId);
  }

  async getTotalQuantityByItem(itemId: string, householdId: string): Promise<number> {
    return await this.storedItemRepository.getTotalQuantityByItem(itemId, householdId);
  }

  private mapToDto(storedItem: StoredItem): StoredItemDto {
    const effectiveExpirationDate = storedItem.getEffectiveExpirationDate();
    
    const dto: StoredItemDto = {
      id: storedItem.id,
      itemId: storedItem.itemId,
      storageAreaId: storedItem.storageAreaId,
      quantity: Number(storedItem.quantity),
      unit: storedItem.unit,
      expirationDate: storedItem.expirationDate ? new Date(storedItem.expirationDate).toISOString().split('T')[0] : null,
      location: storedItem.location,
      isOpened: storedItem.isOpened,
      openedDate: storedItem.openedDate ? new Date(storedItem.openedDate).toISOString().split('T')[0] : null,
      frozenDate: storedItem.frozenDate ? new Date(storedItem.frozenDate).toISOString().split('T')[0] : null,
      householdId: storedItem.householdId,
      createdBy: storedItem.createdBy,
      createdAt: storedItem.createdAt.toISOString(),
      updatedAt: storedItem.updatedAt.toISOString(),
      isExpired: storedItem.isExpired(),
      isExpiringSoon: storedItem.isExpiringSoon(),
      daysUntilExpiration: storedItem.getDaysUntilExpiration(),
      effectiveExpirationDate: effectiveExpirationDate ? effectiveExpirationDate.toISOString().split('T')[0] : null,
      daysFrozen: storedItem.getDaysFrozen(),
      isFrozenTooLong: storedItem.isFrozenTooLong(),
      daysRemainingInFreezer: storedItem.getDaysRemainingInFreezer(),
      recommendedFreezerDays: storedItem.getRecommendedFreezerStorageDays(),
    };

    // Add related data if loaded
    if (storedItem.item) {
      dto.item = {
        id: storedItem.item.id,
        name: storedItem.item.name,
        category: storedItem.item.category,
        defaultUnit: storedItem.item.defaultUnit,
        availableUnits: storedItem.item.availableUnits,
        daysAfterOpening: storedItem.item.daysAfterOpening || undefined,
        imageUrl: storedItem.item.imageUrl,
        createdBy: storedItem.item.createdBy,
        householdId: storedItem.item.householdId,
        createdAt: storedItem.item.createdAt.toISOString(),
        updatedAt: storedItem.item.updatedAt.toISOString(),
      };
    }

    if (storedItem.storageArea) {
      dto.storageArea = {
        id: storedItem.storageArea.id,
        name: storedItem.storageArea.name,
        emoji: storedItem.storageArea.emoji,
        type: storedItem.storageArea.type,
      };
    }

    if (storedItem.creator) {
      dto.creator = {
        id: storedItem.creator.id,
        displayName: `${storedItem.creator.firstName} ${storedItem.creator.lastName}`,
        email: storedItem.creator.email,
      };
    }

    return dto;
  }
} 