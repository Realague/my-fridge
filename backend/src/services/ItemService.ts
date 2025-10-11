import { ItemRepository } from '../repositories/ItemRepository';
import { CreateItemDto, UpdateItemDto, GetItemsQueryDto, ItemDto } from '../types/ItemDto';
import { ApiResponse } from '../types/ApiResponse';
import { Item } from '../models';
import { ItemCascadeDeletionService } from './ItemCascadeDeletionService';

export class ItemService {
  private itemRepository: ItemRepository;
  private cascadeDeletionService: ItemCascadeDeletionService;

  constructor() {
    this.itemRepository = new ItemRepository();
    this.cascadeDeletionService = new ItemCascadeDeletionService();
  }

  async createItem(itemData: CreateItemDto): Promise<ApiResponse<ItemDto>> {
    try {
      // Check for duplicate name within the household
      if (itemData.householdId) {
        const isDuplicate = await this.itemRepository.checkDuplicateName(
          itemData.name, 
          itemData.householdId
        );
        
        if (isDuplicate) {
          return {
            success: false,
            error: `An item with the name "${itemData.name}" already exists in this household`,
          };
        }
      }

      const item = await this.itemRepository.create(itemData);

      if (!item) {
        return {
          success: false,
          error: 'Failed to create item',
        };
      }

      return {
        success: true,
        data: this.formatItemResponse(item),
        message: 'Item created successfully',
      };
    } catch (error) {
      console.error('Error creating item:', error);
      return {
        success: false,
        error: 'Failed to create item',
      };
    }
  }

  async getItemById(id: string, householdId?: string): Promise<ApiResponse<ItemDto>> {
    try {
      const item = await this.itemRepository.findById(id);
      
      if (!item) {
        return {
          success: false,
          error: 'Item not found',
        };
      }

      // Check if item belongs to the specified household
      if (householdId && item.householdId && item.householdId !== householdId) {
        return {
          success: false,
          error: 'Item not found in this household',
        };
      }

      return {
        success: true,
        data: this.formatItemResponse(item),
      };
    } catch (error) {
      console.error('Error fetching item:', error);
      return {
        success: false,
        error: 'Failed to fetch item',
      };
    }
  }

  async getItems(query: GetItemsQueryDto = {}): Promise<ApiResponse<{ items: ItemDto[]; total: number }>> {
    try {
      const { items, total } = await this.itemRepository.findAll(query);
      
      return {
        success: true,
        data: {
          items: items.map(item => this.formatItemResponse(item)),
          total,
        },
      };
    } catch (error) {
      console.error('Error fetching items:', error);
      return {
        success: false,
        error: 'Failed to fetch items',
      };
    }
  }

  async getItemsByHousehold(householdId: string): Promise<ApiResponse<ItemDto[]>> {
    try {
      const items = await this.itemRepository.findByHouseholdId(householdId);
      
      return {
        success: true,
        data: items.map(item => this.formatItemResponse(item)),
      };
    } catch (error) {
      console.error('Error fetching items by household:', error);
      return {
        success: false,
        error: 'Failed to fetch items by household',
      };
    }
  }

  async updateItem(id: string, updateData: UpdateItemDto, householdId?: string): Promise<ApiResponse<ItemDto>> {
    try {
      // Check if item belongs to household before updating
      if (householdId) {
        const belongsToHousehold = await this.itemRepository.checkItemBelongsToHousehold(id, householdId);
        if (!belongsToHousehold) {
          return {
            success: false,
            error: 'Item not found in this household',
          };
        }

        // Check for duplicate name if name is being updated
        if (updateData.name) {
          const isDuplicate = await this.itemRepository.checkDuplicateName(
            updateData.name, 
            householdId, 
            id // Exclude current item from duplicate check
          );
          
          if (isDuplicate) {
            return {
              success: false,
              error: `An item with the name "${updateData.name}" already exists in this household`,
            };
          }
        }
      }

      const item = await this.itemRepository.update(id, updateData);
      
      if (!item) {
        return {
          success: false,
          error: 'Item not found',
        };
      }

      return {
        success: true,
        data: this.formatItemResponse(item),
        message: 'Item updated successfully',
      };
    } catch (error) {
      console.error('Error updating item:', error);
      return {
        success: false,
        error: 'Failed to update item',
      };
    }
  }

  async deleteItem(id: string, householdId?: string, userId?: string): Promise<ApiResponse<void>> {
    try {
      // Check if item belongs to household before deleting
      if (householdId) {
        const belongsToHousehold = await this.itemRepository.checkItemBelongsToHousehold(id, householdId);
        if (!belongsToHousehold) {
          return {
            success: false,
            error: 'Item not found in this household',
          };
        }

        // Check admin permissions for household items
        if (userId) {
          const { HouseholdRepository } = await import('../repositories/HouseholdRepository');
          const householdRepository = new HouseholdRepository();
          const isAdmin = await householdRepository.isAdmin(householdId, userId);
          
          if (!isAdmin) {
            return {
              success: false,
              error: 'Access denied. Admin privileges required to delete items.',
            };
          }
        }
      }

      // Use cascade deletion to delete the item and all related entities
      await this.cascadeDeletionService.deleteItemCascade(id);

      return {
        success: true,
        message: 'Item and all related data deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting item:', error);
      return {
        success: false,
        error: 'Failed to delete item',
      };
    }
  }

  private formatItemResponse(item: Item): ItemDto {
    // Ensure availableUnits is always an array
    let availableUnits = item.availableUnits;
    if (typeof availableUnits === 'string') {
      try {
        availableUnits = JSON.parse(availableUnits);
      } catch {
        availableUnits = [item.defaultUnit];
      }
    }
    if (!Array.isArray(availableUnits)) {
      availableUnits = [item.defaultUnit];
    }

    return {
      id: item.id,
      name: item.name,
      nameKey: item.nameKey,
      category: item.category,
      defaultUnit: item.defaultUnit,
      availableUnits: availableUnits,
      createdBy: item.createdBy,
      householdId: item.householdId,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      creator: item.creator ? {
        id: item.creator.id,
        displayName: item.creator.firstName + ' ' + item.creator.lastName,
        email: item.creator.email,
      } : undefined,
      household: item.household ? {
        id: item.household.id,
        name: item.household.name,
      } : undefined,
    };
  }
} 