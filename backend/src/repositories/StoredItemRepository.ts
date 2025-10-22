import { Op } from 'sequelize';
import { StoredItem } from '../models/StoredItem';
import { Item } from '../models/Item';
import { StorageArea } from '../models/StorageArea';
import { User } from '../models/User';
import { CreateStoredItemDto, UpdateStoredItemDto, GetStoredItemsQueryDto } from '../types/ItemDto';

export class StoredItemRepository {
  async create(data: CreateStoredItemDto): Promise<StoredItem> {
    const createData = {
      ...data,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
      openedDate: data.openedDate ? new Date(data.openedDate) : null,
    };
    return await StoredItem.create(createData);
  }

  async findById(id: string, householdId: string): Promise<StoredItem | null> {
    return await StoredItem.findOne({
      where: { id, householdId },
      include: [
        {
          model: Item,
          as: 'item',
        },
        {
          model: StorageArea,
          as: 'storageArea',
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
  }

  async findAll(query: GetStoredItemsQueryDto): Promise<{ items: StoredItem[]; total: number }> {
    const { householdId, storageAreaId, itemId, search, isExpired, isExpiringSoon, limit = 50, offset = 0 } = query;

    const whereConditions: any = { householdId };

    if (storageAreaId) {
      whereConditions.storageAreaId = storageAreaId;
    }

    if (itemId) {
      whereConditions.itemId = itemId;
    }

    // Handle expiration filters
    if (isExpired === true) {
      whereConditions.expirationDate = {
        [Op.lt]: new Date(),
      };
    } else if (isExpiringSoon === true) {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      whereConditions.expirationDate = {
        [Op.between]: [new Date(), threeDaysFromNow],
      };
    }

    const includeConditions: any[] = [
      {
        model: Item,
        as: 'item',
        ...(search && {
          where: {
            name: {
              [Op.iLike]: `%${search}%`,
            },
          },
        }),
      },
      {
        model: StorageArea,
        as: 'storageArea',
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
    ];

    const { count, rows } = await StoredItem.findAndCountAll({
      where: whereConditions,
      include: includeConditions,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return { items: rows, total: count };
  }

  async findByStorageArea(storageAreaId: string, householdId: string): Promise<StoredItem[]> {
    return await StoredItem.findAll({
      where: { storageAreaId, householdId },
      include: [
        {
          model: Item,
          as: 'item',
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async findExpiring(householdId: string, days: number = 3): Promise<StoredItem[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    return await StoredItem.findAll({
      where: {
        householdId,
        expirationDate: {
          [Op.between]: [new Date(), targetDate],
        },
      },
      include: [
        {
          model: Item,
          as: 'item',
        },
        {
          model: StorageArea,
          as: 'storageArea',
        },
      ],
      order: [['expirationDate', 'ASC']],
    });
  }

  async findExpired(householdId: string): Promise<StoredItem[]> {
    return await StoredItem.findAll({
      where: {
        householdId,
        expirationDate: {
          [Op.lt]: new Date(),
        },
      },
      include: [
        {
          model: Item,
          as: 'item',
        },
        {
          model: StorageArea,
          as: 'storageArea',
        },
      ],
      order: [['expirationDate', 'ASC']],
    });
  }

  async update(id: string, householdId: string, data: UpdateStoredItemDto): Promise<StoredItem | null> {
    const storedItem = await StoredItem.findOne({ where: { id, householdId } });
    if (!storedItem) return null;

    const updateData = {
      ...data,
      expirationDate: data.expirationDate !== undefined 
        ? (data.expirationDate ? new Date(data.expirationDate) : null)
        : undefined,
      openedDate: data.openedDate !== undefined 
        ? (data.openedDate ? new Date(data.openedDate) : null)
        : undefined,
    };

    await storedItem.update(updateData);
    return await this.findById(id, householdId);
  }

  async delete(id: string, householdId: string): Promise<boolean> {
    const result = await StoredItem.destroy({ where: { id, householdId } });
    return result > 0;
  }

  async getTotalQuantityByItem(itemId: string, householdId: string, targetUnit?: string): Promise<number> {
    const storedItems = await StoredItem.findAll({
      where: { itemId, householdId },
      attributes: ['quantity', 'unit'],
    });

    if (storedItems.length === 0) return 0;

    // Import unit conversion utilities
    const { normalizeToBaseUnit, getUnitType, convertQuantity, UnitType } = require('../utils/unitConversion');

    // Group by unit type
    const unitTypes = new Map<string, Array<{ quantity: number; unit: string }>>();
    
    storedItems.forEach((item) => {
      const type = getUnitType(item.unit);
      if (!unitTypes.has(type)) {
        unitTypes.set(type, []);
      }
      unitTypes.get(type)!.push({
        quantity: Number(item.quantity),
        unit: item.unit
      });
    });

    // If target unit is specified and all items can be converted to it
    if (targetUnit) {
      const targetType = getUnitType(targetUnit);
      const itemsOfTargetType = unitTypes.get(targetType) || [];
      
      if (itemsOfTargetType.length === storedItems.length) {
        // All items are convertible to target unit
        return itemsOfTargetType.reduce((total, item) => {
          const converted = convertQuantity(item.quantity, item.unit, targetUnit);
          return total + (converted || 0);
        }, 0);
      }
    }

    // If all items are weight or volume, normalize and sum
    if (unitTypes.size === 1) {
      const entry = Array.from(unitTypes.entries())[0];
      if (entry) {
        const [type, items] = entry;
        if (type === UnitType.WEIGHT || type === UnitType.VOLUME) {
          // Normalize all to base unit and sum
          return items.reduce((total: number, item: { quantity: number; unit: string; }) => {
          const normalized = normalizeToBaseUnit(item.quantity, item.unit);
          return total + normalized.quantity;
        }, 0);
      }
    }
  }

    // Cannot aggregate - return sum (for COUNT types) or 0
    if (unitTypes.size === 1 && unitTypes.has(UnitType.COUNT)) {
      return storedItems.reduce((total, item) => total + Number(item.quantity), 0);
    }

    // Mixed unit types - return 0 to indicate incompatible units
    return 0;
  }
} 