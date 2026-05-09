import { StoredItemRepository } from '../repositories/StoredItemRepository';
import { CreateStoredItemDto, UpdateStoredItemDto, GetStoredItemsQueryDto, StoredItemDto } from '../types/ItemDto';
import { StoredItem } from '../models/StoredItem';
import { StorageArea } from '../models/StorageArea';
import { Item } from '../models/Item';
import { Recipe } from '../models/Recipe';
import { ItemCategory, StorageAreaType, Unit } from '../types/enums';
import { BadRequestError } from '../errors/CustomErrors';

export class StoredItemService {
  private storedItemRepository: StoredItemRepository;

  constructor() {
    this.storedItemRepository = new StoredItemRepository();
  }

  async createStoredItem(data: CreateStoredItemDto): Promise<StoredItemDto> {
    // Check if storage area is freezer type and set frozenDate accordingly
    const storageArea = await StorageArea.findByPk(data.storageAreaId);
    const inFreezer = storageArea?.type === StorageAreaType.FREEZER;

    let resolvedItemId = data.itemId;

    // Cooked-meal flow: resolve or create the underlying Item lazily.
    if (data.articleType === 'cooked_meal') {
      resolvedItemId = await this.resolveCookedMealItemId(data);
    }

    if (!resolvedItemId) {
      throw new BadRequestError('itemId is required (or articleType=cooked_meal with name)');
    }

    const createData = {
      ...data,
      itemId: resolvedItemId,
      expirationDate: inFreezer ? undefined : data.expirationDate,
      frozenDate: inFreezer ? new Date().toISOString().split('T')[0] : undefined,
      cookedDate: data.articleType === 'cooked_meal' ? data.cookedDate : undefined,
    };

    const storedItem = await this.storedItemRepository.create(createData);
    return this.mapToDto(storedItem);
  }

  /**
   * Resolves the Item id for a cooked-meal stored item.
   *
   * - If `recipeId` is provided: look up an existing cooked_meal Item with this
   *   recipeId. If none, create one (lazy creation).
   * - Otherwise (free-text): always create a fresh one-shot Item. It will be
   *   cleaned up automatically when its last StoredItem disappears.
   */
  private async resolveCookedMealItemId(data: CreateStoredItemDto): Promise<string> {
    const name = (data.name ?? '').trim();
    if (!name) {
      throw new BadRequestError('Cooked-meal articles require a name');
    }

    if (data.recipeId) {
      // Sanity-check: recipe must exist and belong to the same household.
      const recipe = await Recipe.findOne({
        where: { id: data.recipeId, householdId: data.householdId },
      });
      if (!recipe) {
        throw new BadRequestError('Recipe not found in this household');
      }

      const existing = await Item.findOne({
        where: { recipeId: data.recipeId, householdId: data.householdId },
      });
      if (existing) return existing.id;

      const created = await Item.create({
        name,
        category: ItemCategory.COOKED_MEAL,
        defaultUnit: Unit.SERVING,
        availableUnits: [Unit.SERVING],
        pieceAlias: null,
        daysAfterOpening: null,
        excludeFromShopping: true,
        imageUrl: null,
        householdId: data.householdId,
        createdBy: data.createdBy,
        recipeId: data.recipeId,
      });
      return created.id;
    }

    // Free-text: always create a one-shot Item.
    const created = await Item.create({
      name,
      category: ItemCategory.COOKED_MEAL,
      defaultUnit: Unit.SERVING,
      availableUnits: [Unit.SERVING],
      pieceAlias: null,
      daysAfterOpening: null,
      excludeFromShopping: true,
      imageUrl: null,
      householdId: data.householdId,
      createdBy: data.createdBy,
      recipeId: null,
    });
    return created.id;
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

    const updateData: UpdateStoredItemDto & { frozenDate?: string | null } = { ...data };

    if (data.storageAreaId !== undefined && data.storageAreaId !== currentItem.storageAreaId) {
      const newStorageArea = await StorageArea.findByPk(data.storageAreaId);
      if (!newStorageArea || newStorageArea.householdId !== householdId) {
        throw new BadRequestError('Invalid storage area for this household');
      }
      const currentStorageArea = await StorageArea.findByPk(currentItem.storageAreaId);

      if (newStorageArea.type === StorageAreaType.FREEZER) {
        updateData.frozenDate = new Date().toISOString().split('T')[0];
      } else if (currentStorageArea?.type === StorageAreaType.FREEZER) {
        updateData.frozenDate = null;
      }
    }

    const finalStorageAreaId =
      data.storageAreaId !== undefined ? data.storageAreaId : currentItem.storageAreaId;
    const finalArea = await StorageArea.findByPk(finalStorageAreaId);
    if (finalArea?.type === StorageAreaType.FREEZER) {
      updateData.expirationDate = null;
    }

    const storedItem = await this.storedItemRepository.update(id, householdId, updateData);
    return storedItem ? this.mapToDto(storedItem) : null;
  }

  async deleteStoredItem(id: string, householdId: string): Promise<boolean> {
    // Capture itemId before deletion so we can run the one-shot cleanup afterwards.
    const existing = await this.storedItemRepository.findById(id, householdId);
    if (!existing) return false;

    const deleted = await this.storedItemRepository.delete(id, householdId);
    if (deleted) {
      await this.cleanupOneShotCookedMealItem(existing.itemId, householdId);
    }
    return deleted;
  }

  /**
   * Consume one portion of a cooked meal. Decrements quantity by 1, or deletes
   * the StoredItem entirely when only one portion remains. Returns the updated
   * DTO, or null if the row is gone (consumed to zero).
   */
  async consumePortion(id: string, householdId: string): Promise<{ remaining: StoredItemDto | null; consumed: boolean }> {
    const current = await this.storedItemRepository.findById(id, householdId);
    if (!current) return { remaining: null, consumed: false };

    const currentQty = Number(current.quantity);
    if (currentQty <= 1) {
      await this.deleteStoredItem(id, householdId);
      return { remaining: null, consumed: true };
    }

    const updated = await this.storedItemRepository.update(id, householdId, {
      quantity: currentQty - 1,
    });
    return { remaining: updated ? this.mapToDto(updated) : null, consumed: true };
  }

  async getTotalQuantityByItem(itemId: string, householdId: string): Promise<number> {
    return await this.storedItemRepository.getTotalQuantityByItem(itemId, householdId);
  }

  /**
   * Delete the underlying Item if it is a one-shot cooked meal (no recipe link)
   * AND no StoredItem references it anymore. Safe no-op for everything else.
   */
  private async cleanupOneShotCookedMealItem(itemId: string, householdId: string): Promise<void> {
    const item = await Item.findOne({ where: { id: itemId, householdId } });
    if (!item) return;
    if (item.category !== ItemCategory.COOKED_MEAL) return;
    if (item.recipeId) return; // Recipe-linked items persist with the recipe.

    const remaining = await StoredItem.count({ where: { itemId, householdId } });
    if (remaining === 0) {
      await item.destroy();
    }
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
      cookedDate: storedItem.cookedDate ? new Date(storedItem.cookedDate).toISOString().split('T')[0] : null,
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
        pieceAlias: storedItem.item.pieceAlias ?? null,
        daysAfterOpening: storedItem.item.daysAfterOpening || undefined,
        imageUrl: storedItem.item.imageUrl,
        createdBy: storedItem.item.createdBy,
        householdId: storedItem.item.householdId,
        recipeId: storedItem.item.recipeId ?? null,
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
