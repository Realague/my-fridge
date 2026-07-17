import { Op } from 'sequelize';
import { ShoppingItem } from '../models/ShoppingItem';
import { Item } from '../models/Item';
import { User } from '../models/User';
import { CreateShoppingItemDto, UpdateShoppingItemDto, GetShoppingItemsQueryDto } from '../types/ItemDto';
import { ShoppingItemStatus } from '../types/enums';

export class ShoppingItemRepository {
  async create(data: CreateShoppingItemDto): Promise<ShoppingItem> {
    return await ShoppingItem.create({
      itemId: data.itemId,
      householdId: data.householdId,
      quantity: data.quantity,
      unit: data.unit,
      createdBy: data.createdBy,
      priority: data.priority || 0,
      // Defaults to TO_BUY at the model level when omitted.
      ...(data.status ? { status: data.status } : {}),
    });
  }

  async findById(id: string): Promise<ShoppingItem | null> {
    const whereClause: any = { id };

    return await ShoppingItem.findOne({
      where: whereClause,
      include: [
        {
          model: Item,
          as: 'item',
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
      ],
    });
  }

  async findByHouseholdId(query: GetShoppingItemsQueryDto): Promise<{ items: ShoppingItem[]; total: number }> {
    const whereClause: any = {
      householdId: query.householdId,
    };

    if (query.status !== undefined) {
      whereClause.status = query.status;
    }

    const options: any = {
      where: whereClause,
      include: [
        {
          model: Item,
          as: 'item',
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
      ],
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'ASC'],
      ],
    };

    if (query.limit) {
      options.limit = query.limit;
    }

    if (query.offset) {
      options.offset = query.offset;
    }

    const { rows: items, count: total } = await ShoppingItem.findAndCountAll(options);

    return { items, total };
  }

  async update(id: string, data: UpdateShoppingItemDto): Promise<ShoppingItem | null> {
    const whereClause: any = { id };

    const [updatedRowsCount] = await ShoppingItem.update(data, {
      where: whereClause,
    });

    if (updatedRowsCount === 0) {
      return null;
    }

    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const whereClause: any = { id };

    const deletedRowsCount = await ShoppingItem.destroy({
      where: whereClause,
    });

    return deletedRowsCount > 0;
  }

  async deleteByItemId(itemId: string, householdId: string): Promise<boolean> {
    const deletedRowsCount = await ShoppingItem.destroy({
      where: {
        itemId,
        householdId,
      },
    });

    return deletedRowsCount > 0;
  }

  async reorderItems(householdId: string, itemPriorities: Array<{ id: string; priority: number }>): Promise<boolean> {
    try {
      const updatePromises = itemPriorities.map(({ id, priority }) =>
        ShoppingItem.update(
          { priority },
          {
            where: {
              id,
              householdId,
            },
          }
        )
      );

      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      console.error('Error reordering shopping items:', error);
      return false;
    }
  }

  async findByItemAndHousehold(itemId: string, householdId: string, status: ShoppingItemStatus, excludeId?: string): Promise<ShoppingItem | null> {
    const whereClause: any = {
      itemId,
      householdId,
      status,
    };

    if (excludeId) {
      whereClause.id = {
        [Op.ne]: excludeId
      };
    }

    return await ShoppingItem.findOne({
      where: whereClause
    });
  }

  /**
   * Sum all "to buy" ShoppingItem quantities for a given item, normalized to
   * `targetUnit` when units are convertible. Items in incompatible units are
   * skipped.
   */
  async getActiveQuantityByItem(itemId: string, householdId: string, targetUnit: string): Promise<number> {
    const items = await ShoppingItem.findAll({
      where: { itemId, householdId, status: ShoppingItemStatus.TO_BUY },
      attributes: ['quantity', 'unit'],
    });
    if (items.length === 0) return 0;

    const { convertQuantity, getUnitType } = require('../utils/unitConversion');
    const targetType = getUnitType(targetUnit);
    let total = 0;
    for (const item of items) {
      const itemType = getUnitType(item.unit);
      if (itemType !== targetType) continue;
      const converted = convertQuantity(Number(item.quantity), item.unit, targetUnit);
      if (typeof converted === 'number') total += converted;
    }
    return total;
  }

  async getDuplicateShoppingItem(itemId: string, householdId: string, unit: string, status: ShoppingItemStatus, excludeId?: string): Promise<ShoppingItem | null> {
    const whereClause: any = {
      itemId,
      householdId,
      unit,
      status,
    };

    if (excludeId) {
      whereClause.id = {
        [Op.ne]: excludeId
      };
    }

    const existingItem = await ShoppingItem.findOne({
      where: whereClause
    });

    return existingItem || null;
  }
} 