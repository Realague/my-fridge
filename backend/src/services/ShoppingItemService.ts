import { ShoppingItemRepository } from '../repositories/ShoppingItemRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { HouseholdRepository } from '../repositories/HouseholdRepository';
import { StoredItemService } from './StoredItemService';
import { CreateShoppingItemDto, UpdateShoppingItemDto, GetShoppingItemsQueryDto, ShoppingItemDto } from '../types/ItemDto';
import { ApiResponse } from '../types/ApiResponse';
import { ShoppingItem } from '../models/ShoppingItem';
import { STORAGE_UNITS, Unit } from '../types/enums';
import { convertToStorageUnit, canConvertUnits, normalizeToBaseUnit, getBestDisplayUnit } from '../utils/unitConversion';
import { Item } from '../models/Item';

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
      if (!STORAGE_UNITS.includes(data.unit as Unit)) {
        const converted = convertToStorageUnit(data.quantity, data.unit, item.category);
        data.quantity = converted.quantity;
        data.unit = converted.unit;
      }

      // Check for duplicate item with same unit in the household
      let existingShoppingItem = await this.shoppingItemRepository.getDuplicateShoppingItem(
        data.itemId,
        data.householdId,
        data.unit,
        false
      );

      if (existingShoppingItem) {
        data.quantity += existingShoppingItem.quantity;
      } else {
        // Check for an existing item with a compatible unit (e.g., kg + g, l + ml)
        const compatibleItem = await this.shoppingItemRepository.findByItemAndHousehold(
          data.itemId,
          data.householdId,
          false
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
          imageUrl: item.imageUrl,
          createdBy: item.createdBy,
          householdId: item.householdId,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        },
        householdId: shoppingItem.householdId,
        quantity: shoppingItem.quantity,
        unit: shoppingItem.unit,
        completed: shoppingItem.completed,
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
        if (!STORAGE_UNITS.includes(data.unit as Unit)) {
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
          false,
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

  async toggleShoppingItemCompleted(id: string): Promise<ApiResponse<ShoppingItemDto>> {
    try {
      const shoppingItem = await this.shoppingItemRepository.findById(id);

      if (!shoppingItem) {
        return {
          success: false,
          error: 'Shopping item not found',
        };
      }

      const wasCompleted = shoppingItem.completed;
      const willBeCompleted = !wasCompleted;

      let duplicateShoppingItem = await this.shoppingItemRepository.getDuplicateShoppingItem(
        shoppingItem.itemId,
        shoppingItem.householdId,
        shoppingItem.unit,
        willBeCompleted,
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
          willBeCompleted,
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
        const updateData: any = { quantity: mergedQuantity, completed: willBeCompleted };
        if (mergedUnit) updateData.unit = mergedUnit;
        updatedShoppingItem = await this.shoppingItemRepository.update(id, updateData);
      } else {
        updatedShoppingItem = await this.shoppingItemRepository.update(id, { completed: willBeCompleted });
      }

      if (!updatedShoppingItem) {
        return {
          success: false,
          error: 'Failed to toggle shopping item completion',
        };
      }

      // If the item is being unmarked as completed (was completed, now not completed),
      // delete the stored item referenced by storedItemId and clear the reference
      if (wasCompleted && !willBeCompleted && shoppingItem.storedItemId) {
        try {
          const deleteSuccess = await this.storedItemService.deleteStoredItem(
            shoppingItem.storedItemId,
            shoppingItem.householdId
          );
          
          if (deleteSuccess) {
            // Clear the storedItemId reference
            await this.shoppingItemRepository.update(id, { storedItemId: null });
          }
        } catch (error) {
          console.error('Error deleting stored item when unmarking shopping item:', error);
          // Don't fail the entire operation if stored item deletion fails
        }
      }

      return {
        success: true,
        data: this.formatShoppingItemResponse(updatedShoppingItem),
      };
    } catch (error) {
      console.error('Error toggling shopping item completion:', error);
      return {
        success: false,
        error: 'Failed to toggle shopping item completion',
      };
    }
  }

  async bulkUpdateCompleted(ids: string[], completed: boolean, householdId?: string): Promise<ApiResponse<{ updatedCount: number }>> {
    try {
      const updatedCount = await this.shoppingItemRepository.bulkUpdateCompleted(ids, completed, householdId);

      return {
        success: true,
        data: { updatedCount },
      };
    } catch (error) {
      console.error('Error bulk updating shopping items:', error);
      return {
        success: false,
        error: 'Failed to bulk update shopping items',
      };
    }
  }

  async clearCompleted(householdId: string): Promise<ApiResponse<{ deletedCount: number }>> {
    try {
      const deletedCount = await this.shoppingItemRepository.clearCompleted(householdId);

      return {
        success: true,
        data: { deletedCount },
      };
    } catch (error) {
      console.error('Error clearing completed shopping items:', error);
      return {
        success: false,
        error: 'Failed to clear completed shopping items',
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
        imageUrl: shoppingItem.item.imageUrl,
        createdBy: shoppingItem.item.createdBy,
        householdId: shoppingItem.item.householdId,
        createdAt: shoppingItem.item.createdAt.toISOString(),
        updatedAt: shoppingItem.item.updatedAt.toISOString(),
      };
    }

    return {
      id: shoppingItem.id,
      item: itemData,
      householdId: shoppingItem.householdId,
      quantity: shoppingItem.quantity,
      unit: shoppingItem.unit,
      completed: shoppingItem.completed,
      priority: shoppingItem.priority,
      storedItemId: shoppingItem.storedItemId,
      createdBy: shoppingItem.createdBy,
      createdAt: shoppingItem.createdAt.toISOString(),
      updatedAt: shoppingItem.updatedAt.toISOString(),
    };
  }
} 