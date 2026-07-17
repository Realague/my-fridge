import { ShoppingItemRepository } from '../repositories/ShoppingItemRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { HouseholdRepository } from '../repositories/HouseholdRepository';
import { StoredItemService } from './StoredItemService';
import { CreateShoppingItemDto, UpdateShoppingItemDto, GetShoppingItemsQueryDto, ShoppingItemDto, BulkTransferToStorageDto, CreateStoredItemDto } from '../types/ItemDto';
import { ApiResponse } from '../types/ApiResponse';
import { ShoppingItem } from '../models/ShoppingItem';
import { LINE_STORAGE_UNITS, Unit, StorageAreaType, ShoppingItemStatus } from '../types/enums';
import { convertToStorageUnit, canConvertUnits, normalizeToBaseUnit, getBestDisplayUnit } from '../utils/unitConversion';
import { Item } from '../models/Item';
import { StorageArea } from '../models/StorageArea';
import sequelize from '../config/database';

export class ShoppingItemService {
  private shoppingItemRepository: ShoppingItemRepository;
  private itemRepository: ItemRepository;
  private householdRepository: HouseholdRepository;
  private storedItemService: StoredItemService;

  constructor(
    shoppingItemRepository?: ShoppingItemRepository,
    itemRepository?: ItemRepository,
    householdRepository?: HouseholdRepository,
    storedItemService?: StoredItemService
  ) {
    this.shoppingItemRepository = shoppingItemRepository || new ShoppingItemRepository();
    this.itemRepository = itemRepository || new ItemRepository();
    this.householdRepository = householdRepository || new HouseholdRepository();
    this.storedItemService = storedItemService || new StoredItemService();
  }

  async createShoppingItem(data: CreateShoppingItemDto): Promise<ApiResponse<ShoppingItemDto>> {
    try {
      // Validate that the item exists
      const item = await this.itemRepository.findById(data.itemId);
      if (!item) {
        return {
          success: false,
          error: 'Item not found',
        };
      }

      // Validate that the household exists
      const household = await this.householdRepository.findById(data.householdId);
      if (!household) {
        return {
          success: false,
          error: 'Household not found',
        };
      }

      // Convert cooking measurements to storage-appropriate units
      // For dry ingredients, convert volume to weight (e.g., tsp of salt -> grams)
      if (!LINE_STORAGE_UNITS.includes(data.unit as Unit)) {
        const converted = convertToStorageUnit(data.quantity, data.unit, item.category);
        data.quantity = converted.quantity;
        data.unit = converted.unit;
      }

      // Check for duplicate item with same unit in the household ("to buy")
      let existingShoppingItem = await this.shoppingItemRepository.getDuplicateShoppingItem(
        data.itemId,
        data.householdId,
        data.unit,
        ShoppingItemStatus.TO_BUY
      );

      if (existingShoppingItem) {
        data.quantity += existingShoppingItem.quantity;
      } else {
        // Check for an existing item with a compatible unit (e.g., kg + g, l + ml)
        const compatibleItem = await this.shoppingItemRepository.findByItemAndHousehold(
          data.itemId,
          data.householdId,
          ShoppingItemStatus.TO_BUY
        );

        if (compatibleItem && canConvertUnits(data.unit, compatibleItem.unit)) {
          const newNormalized = normalizeToBaseUnit(data.quantity, data.unit);
          const existingNormalized = normalizeToBaseUnit(compatibleItem.quantity, compatibleItem.unit);
          const totalBase = newNormalized.quantity + existingNormalized.quantity;
          const best = getBestDisplayUnit(totalBase, newNormalized.unit, true);
          data.quantity = best.quantity;
          data.unit = best.unit;
          existingShoppingItem = compatibleItem;
        }
      }

      const shoppingItem = existingShoppingItem ? await this.shoppingItemRepository.update(existingShoppingItem.id, data) : await this.shoppingItemRepository.create(data);

      if (!shoppingItem) {
        return {
          success: false,
          error: 'Failed to create or update shopping item',
        };
      }

      // Create the response directly from the data we already have
      const shoppingItemDto: ShoppingItemDto = {
        id: shoppingItem.id,
        item: {
          id: item.id,
          name: item.name,
          category: item.category,
          defaultUnit: item.defaultUnit,
          availableUnits: item.availableUnits,
          pieceAlias: item.pieceAlias ?? null,
          imageUrl: item.imageUrl,
          createdBy: item.createdBy,
          householdId: item.householdId,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        },
        householdId: shoppingItem.householdId,
        quantity: shoppingItem.quantity,
        unit: shoppingItem.unit,
        status: shoppingItem.status,
        priority: shoppingItem.priority,
        storedItemId: shoppingItem.storedItemId,
        createdBy: shoppingItem.createdBy,
        createdAt: shoppingItem.createdAt.toISOString(),
        updatedAt: shoppingItem.updatedAt.toISOString(),
      };

      return {
        success: true,
        data: shoppingItemDto,
      };
    } catch (error) {
      console.error('Error creating shopping item:', error);
      return {
        success: false,
        error: 'Failed to create shopping item',
      };
    }
  }

  async getShoppingItemById(id: string): Promise<ApiResponse<ShoppingItemDto>> {
    try {
      const shoppingItem = await this.shoppingItemRepository.findById(id);

      if (!shoppingItem) {
        return {
          success: false,
          error: 'Shopping item not found',
        };
      }

      return {
        success: true,
        data: this.formatShoppingItemResponse(shoppingItem),
      };
    } catch (error) {
      console.error('Error fetching shopping item:', error);
      return {
        success: false,
        error: 'Failed to fetch shopping item',
      };
    }
  }

  async getShoppingItemsByHousehold(query: GetShoppingItemsQueryDto): Promise<ApiResponse<{ items: ShoppingItemDto[]; total: number }>> {
    try {
      const { items, total } = await this.shoppingItemRepository.findByHouseholdId(query);

      return {
        success: true,
        data: {
          items: items.map(item => this.formatShoppingItemResponse(item)),
          total,
        },
      };
    } catch (error) {
      console.error('Error fetching shopping items by household:', error);
      return {
        success: false,
        error: 'Failed to fetch shopping items by household',
      };
    }
  }

  async updateShoppingItem(id: string, data: UpdateShoppingItemDto): Promise<ApiResponse<ShoppingItemDto>> {
    try {
      // Get the existing shopping item to check for duplicates
      const existingItem = await this.shoppingItemRepository.findById(id);
      if (!existingItem) {
        return {
          success: false,
          error: 'Shopping item not found',
        };
      }

      // Convert cooking measurements to storage-appropriate units if unit is being updated
      // For dry ingredients, convert volume to weight (e.g., tbsp of butter -> grams)
      if (data.unit && data.quantity !== undefined) {
        if (!LINE_STORAGE_UNITS.includes(data.unit as Unit)) {
          // Get item category for density-based conversion
          const item = existingItem.item || await this.itemRepository.findById(existingItem.itemId);
          const category = item?.category;
          const converted = convertToStorageUnit(data.quantity, data.unit, category);
          data.quantity = converted.quantity;
          data.unit = converted.unit;
        }
      }

      // Check for duplicates if itemId, householdId, or unit are being updated
      const itemId = existingItem.item?.id;
      const householdId = existingItem.householdId;
      const unit = data.unit || existingItem.unit;

      var updatedShoppingItem: ShoppingItem | null = null;
      if (itemId && data.unit && data.unit !== existingItem.unit) {
        const duplicateShoppingItem = await this.shoppingItemRepository.getDuplicateShoppingItem(
          itemId,
          householdId,
          unit,
          existingItem.status,
          id // Exclude current item from duplicate check
        );
        
        if (duplicateShoppingItem) {
          await this.deleteShoppingItem(duplicateShoppingItem.id);
          data.quantity = (data.quantity || 0) + duplicateShoppingItem.quantity;
          updatedShoppingItem = await this.shoppingItemRepository.update(duplicateShoppingItem.id, data);
        }
      }

      updatedShoppingItem = await this.shoppingItemRepository.update(id, data);

      if (!updatedShoppingItem) {
        return {
          success: false,
          error: 'Shopping item not found or update failed',
        };
      }

      return {
        success: true,
        data: this.formatShoppingItemResponse(updatedShoppingItem),
      };
    } catch (error) {
      console.error('Error updating shopping item:', error);
      return {
        success: false,
        error: 'Failed to update shopping item',
      };
    }
  }

  async deleteShoppingItem(id: string): Promise<ApiResponse<void>> {
    try {
      const deleted = await this.shoppingItemRepository.delete(id);

      if (!deleted) {
        return {
          success: false,
          error: 'Shopping item not found or delete failed',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting shopping item:', error);
      return {
        success: false,
        error: 'Failed to delete shopping item',
      };
    }
  }

  /**
   * Move a shopping item between "À acheter" (TO_BUY) and "À ranger" (TO_STORE).
   * No storage side effect — storing happens separately via bulkTransferToStorage.
   * Preserves the duplicate-merge behaviour: if an item with the same
   * item/unit already exists in the target status, quantities are merged.
   */
  async setShoppingItemStatus(id: string, status: ShoppingItemStatus): Promise<ApiResponse<ShoppingItemDto>> {
    try {
      const shoppingItem = await this.shoppingItemRepository.findById(id);

      if (!shoppingItem) {
        return {
          success: false,
          error: 'Shopping item not found',
        };
      }

      if (shoppingItem.status === status) {
        // Already in the requested state — nothing to do.
        return {
          success: true,
          data: this.formatShoppingItemResponse(shoppingItem),
        };
      }

      let duplicateShoppingItem = await this.shoppingItemRepository.getDuplicateShoppingItem(
        shoppingItem.itemId,
        shoppingItem.householdId,
        shoppingItem.unit,
        status,
        id
      );

      let mergedQuantity: number | undefined;
      let mergedUnit: string | undefined;

      if (duplicateShoppingItem) {
        mergedQuantity = duplicateShoppingItem.quantity + shoppingItem.quantity;
      } else {
        // Check for compatible unit (e.g., kg + g)
        const compatibleItem = await this.shoppingItemRepository.findByItemAndHousehold(
          shoppingItem.itemId,
          shoppingItem.householdId,
          status,
          id
        );

        if (compatibleItem && canConvertUnits(shoppingItem.unit, compatibleItem.unit)) {
          duplicateShoppingItem = compatibleItem;
          const currentNormalized = normalizeToBaseUnit(shoppingItem.quantity, shoppingItem.unit);
          const existingNormalized = normalizeToBaseUnit(compatibleItem.quantity, compatibleItem.unit);
          const totalBase = currentNormalized.quantity + existingNormalized.quantity;
          const best = getBestDisplayUnit(totalBase, currentNormalized.unit, true);
          mergedQuantity = best.quantity;
          mergedUnit = best.unit;
        }
      }

      let updatedShoppingItem: ShoppingItem | null = null;
      if (duplicateShoppingItem) {
        await this.deleteShoppingItem(duplicateShoppingItem.id);
        const updateData: any = { quantity: mergedQuantity, status };
        if (mergedUnit) updateData.unit = mergedUnit;
        updatedShoppingItem = await this.shoppingItemRepository.update(id, updateData);
      } else {
        updatedShoppingItem = await this.shoppingItemRepository.update(id, { status });
      }

      if (!updatedShoppingItem) {
        return {
          success: false,
          error: 'Failed to update shopping item status',
        };
      }

      return {
        success: true,
        data: this.formatShoppingItemResponse(updatedShoppingItem),
      };
    } catch (error) {
      console.error('Error updating shopping item status:', error);
      return {
        success: false,
        error: 'Failed to update shopping item status',
      };
    }
  }

  async reorderItems(householdId: string, itemPriorities: Array<{ id: string; priority: number }>): Promise<ApiResponse<void>> {
    try {
      const success = await this.shoppingItemRepository.reorderItems(householdId, itemPriorities);

      if (!success) {
        return {
          success: false,
          error: 'Failed to reorder shopping items',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error reordering shopping items:', error);
      return {
        success: false,
        error: 'Failed to reorder shopping items',
      };
    }
  }

  /**
   * Store one or more shopping items into the stock. For each item a StoredItem
   * is created and the ShoppingItem row is DELETED — a stored article leaves the
   * shopping list entirely ("Rangé"). Returns the ids of the removed rows so the
   * client can drop them from its local state.
   */
  async bulkTransferToStorage(data: BulkTransferToStorageDto): Promise<ApiResponse<{ removedShoppingItemIds: string[] }>> {
    const transaction = await sequelize.transaction();

    try {
      const removedShoppingItemIds: string[] = [];

      for (const transferItem of data.items) {
        const shoppingItem = await this.shoppingItemRepository.findById(transferItem.shoppingItemId);
        if (!shoppingItem) {
          await transaction.rollback();
          return { success: false, error: `Shopping item ${transferItem.shoppingItemId} not found` };
        }

        if (shoppingItem.householdId !== data.householdId) {
          await transaction.rollback();
          return { success: false, error: 'Shopping item does not belong to this household' };
        }

        const storageArea = await StorageArea.findByPk(transferItem.storageAreaId, { transaction });
        if (!storageArea) {
          await transaction.rollback();
          return { success: false, error: `Storage area ${transferItem.storageAreaId} not found` };
        }

        const createStoredItemData: CreateStoredItemDto = {
          itemId: shoppingItem.itemId,
          storageAreaId: transferItem.storageAreaId,
          quantity: shoppingItem.quantity,
          unit: shoppingItem.unit as Unit,
          expirationDate: transferItem.expirationDate,
          location: transferItem.location,
          householdId: data.householdId,
          createdBy: data.createdBy,
        };

        await this.storedItemService.createStoredItem(createStoredItemData);

        // The article is now in stock — remove it from the shopping list.
        await this.shoppingItemRepository.delete(shoppingItem.id);
        removedShoppingItemIds.push(shoppingItem.id);
      }

      await transaction.commit();

      return { success: true, data: { removedShoppingItemIds } };
    } catch (error) {
      await transaction.rollback();
      console.error('Error in bulkTransferToStorage:', error);
      return { success: false, error: 'Failed to bulk transfer items to storage' };
    }
  }

  private formatShoppingItemResponse(shoppingItem: ShoppingItem): ShoppingItemDto {
    // Ensure availableUnits is always an array when item is present
    let itemData = null;
    if (shoppingItem.item) {
      let availableUnits = shoppingItem.item.availableUnits;
      if (typeof availableUnits === 'string') {
        try {
          availableUnits = JSON.parse(availableUnits);
        } catch {
          availableUnits = [shoppingItem.item.defaultUnit];
        }
      }
      if (!Array.isArray(availableUnits)) {
        availableUnits = [shoppingItem.item.defaultUnit];
      }

      itemData = {
        id: shoppingItem.item.id,
        name: shoppingItem.item.name,
        category: shoppingItem.item.category,
        defaultUnit: shoppingItem.item.defaultUnit,
        availableUnits: availableUnits,
        pieceAlias: shoppingItem.item.pieceAlias ?? null,
        imageUrl: shoppingItem.item.imageUrl,
        createdBy: shoppingItem.item.createdBy,
        householdId: shoppingItem.item.householdId,
        createdAt: shoppingItem.item.createdAt.toISOString(),
        updatedAt: shoppingItem.item.updatedAt.toISOString(),
      };
    }

    const dto: ShoppingItemDto = {
      id: shoppingItem.id,
      item: itemData,
      householdId: shoppingItem.householdId,
      quantity: shoppingItem.quantity,
      unit: shoppingItem.unit,
      status: shoppingItem.status,
      priority: shoppingItem.priority,
      storedItemId: shoppingItem.storedItemId,
      createdBy: shoppingItem.createdBy,
      createdAt: shoppingItem.createdAt.toISOString(),
      updatedAt: shoppingItem.updatedAt.toISOString(),
    };

    if (shoppingItem.creator) {
      dto.creator = {
        id: shoppingItem.creator.id,
        displayName: `${shoppingItem.creator.firstName} ${shoppingItem.creator.lastName}`,
      };
    }

    return dto;
  }
} 