import { ItemMinimumRepository } from '../repositories/ItemMinimumRepository';
import { StoredItemRepository } from '../repositories/StoredItemRepository';
import { ItemMinimum } from '../models/ItemMinimum';
import { CreateItemMinimumDto, UpdateItemMinimumDto, ItemMinimumDto, GetItemMinimumsQueryDto, LowStockItemDto } from '../types/ItemMinimumDto';
import { BadRequestError } from '../errors/CustomErrors';

export class ItemMinimumService {
  private itemMinimumRepository: ItemMinimumRepository;
  private storedItemRepository: StoredItemRepository;

  constructor() {
    this.itemMinimumRepository = new ItemMinimumRepository();
    this.storedItemRepository = new StoredItemRepository();
  }

  async createItemMinimum(data: CreateItemMinimumDto): Promise<ItemMinimumDto> {
    // Check for duplicate
    const exists = await this.itemMinimumRepository.checkDuplicate(data.itemId, data.householdId, data.minimumUnit);
    if (exists) {
      throw new BadRequestError('A minimum for this item already exists in this household');
    }

    const itemMinimum = await this.itemMinimumRepository.create(data);
    const retrieved = await this.itemMinimumRepository.findById(itemMinimum.id, data.householdId);
    
    if (!retrieved) {
      throw new Error('Failed to retrieve created item minimum');
    }

    return this.mapToDto(retrieved);
  }

  async getItemMinimumById(id: string, householdId: string): Promise<ItemMinimumDto | null> {
    const itemMinimum = await this.itemMinimumRepository.findById(id, householdId);
    return itemMinimum ? this.mapToDto(itemMinimum) : null;
  }

  async getItemMinimums(query: GetItemMinimumsQueryDto): Promise<{ itemMinimums: ItemMinimumDto[]; total: number }> {
    const result = await this.itemMinimumRepository.findAll(query);
    return {
      itemMinimums: result.itemMinimums.map(im => this.mapToDto(im)),
      total: result.total,
    };
  }

  async getItemMinimumsByHousehold(householdId: string): Promise<ItemMinimumDto[]> {
    const itemMinimums = await this.itemMinimumRepository.findByHouseholdId(householdId);
    return itemMinimums.map(im => this.mapToDto(im));
  }

  async updateItemMinimum(id: string, householdId: string, data: UpdateItemMinimumDto): Promise<ItemMinimumDto | null> {
    const existing = await this.itemMinimumRepository.checkDuplicate(id, householdId, data.minimumUnit as string);
    if (existing) {
      throw new BadRequestError('A minimum for this item already exists in this household with this unit');
    }

    const itemMinimum = await this.itemMinimumRepository.update(id, householdId, data as UpdateItemMinimumDto);
    return itemMinimum ? this.mapToDto(itemMinimum) : null;
  }

  async deleteItemMinimum(id: string, householdId: string): Promise<boolean> {
    return await this.itemMinimumRepository.delete(id, householdId);
  }

  async getLowStockItems(householdId: string): Promise<LowStockItemDto[]> {
    // Get all item minimums for the household
    const itemMinimums = await this.itemMinimumRepository.findByHouseholdId(householdId);
    
    const lowStockItems: LowStockItemDto[] = [];
    
    // Import unit conversion utilities
    const { convertQuantity, canConvertUnits } = require('../utils/unitConversion');

    for (const itemMinimum of itemMinimums) {
      // Get total quantity for this item in the minimum's unit
      const totalQuantityInBaseUnit = await this.storedItemRepository.getTotalQuantityByItem(
        itemMinimum.itemId,
        householdId,
        itemMinimum.minimumUnit
      );

      // Convert to minimum unit if possible, otherwise use direct comparison
      let currentQuantity = totalQuantityInBaseUnit;
      
      // Compare quantities in the same unit
      const isLowStock = currentQuantity < parseFloat(itemMinimum.minimumQuantity.toString());
      const quantityNeeded = Math.max(0, parseFloat(itemMinimum.minimumQuantity.toString()) - currentQuantity);

      lowStockItems.push({
        itemMinimum: this.mapToDto(itemMinimum),
        currentQuantity: parseFloat(currentQuantity.toFixed(2)),
        currentUnit: itemMinimum.minimumUnit,
        quantityNeeded: parseFloat(quantityNeeded.toFixed(2)),
        isLowStock,
      });
    }

    // Return only items that are actually low stock
    return lowStockItems.filter(item => item.isLowStock);
  }

  private mapToDto(itemMinimum: ItemMinimum): ItemMinimumDto {
    return {
      id: itemMinimum.id,
      itemId: itemMinimum.itemId,
      householdId: itemMinimum.householdId,
      minimumQuantity: parseFloat(itemMinimum.minimumQuantity.toString()),
      minimumUnit: itemMinimum.minimumUnit,
      shoppingQuantity: parseFloat(itemMinimum.shoppingQuantity.toString()),
      createdBy: itemMinimum.createdBy,
      createdAt: itemMinimum.createdAt.toISOString(),
      updatedAt: itemMinimum.updatedAt.toISOString(),
      item: itemMinimum.item ? {
        id: itemMinimum.item.id,
        name: itemMinimum.item.name,
        category: itemMinimum.item.category,
        defaultUnit: itemMinimum.item.defaultUnit,
        availableUnits: itemMinimum.item.availableUnits,
        imageUrl: itemMinimum.item.imageUrl,
        createdBy: itemMinimum.item.createdBy,
        householdId: itemMinimum.item.householdId,
        createdAt: itemMinimum.item.createdAt.toISOString(),
        updatedAt: itemMinimum.item.updatedAt.toISOString(),
      } : undefined,
      creator: itemMinimum.creator ? {
        id: itemMinimum.creator.id,
        email: itemMinimum.creator.email,
      } : undefined,
      household: itemMinimum.household ? {
        id: itemMinimum.household.id,
        name: itemMinimum.household.name,
      } : undefined,
    };
  }
}
