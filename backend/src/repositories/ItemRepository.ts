import { Op } from 'sequelize';
import { Item, User, Household } from '../models';
import { CreateItemDto, UpdateItemDto, GetItemsQueryDto } from '../types/ItemDto';
import { ItemCategory } from '../types/enums';

export class ItemRepository {
  async create(itemData: CreateItemDto): Promise<Item | null> {
    const item = await Item.create(itemData);
    
    return this.findById(item.id);
  }

  async findById(id: string): Promise<Item | null> {
    return Item.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
        {
          model: Household,
          as: 'household',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    });
  }

  async findAll(query: GetItemsQueryDto = {}): Promise<{ items: Item[]; total: number }> {
    const {
      search,
      householdId,
      limit = 50,
      offset = 0,
    } = query;

    const whereClause: any = {};
    const includeClause: any = [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false,
      },
      {
        model: Household,
        as: 'household',
        attributes: ['id', 'name'],
        required: false,
      },
    ];

    // Filter by household - include items that belong to the household OR are global (null)
    if (householdId) {
      whereClause.householdId = {
        [Op.or]: [householdId, null]
      };
    }

    // Search functionality
    if (search) {
      whereClause.name = {
        [Op.iLike]: `%${search}%`
      };
    }

    const { rows: items, count: total } = await Item.findAndCountAll({
      where: whereClause,
      include: includeClause,
      limit,
      offset,
      order: [['name', 'ASC']],
    });

    return { items, total };
  }

  async findByHouseholdId(householdId: string): Promise<Item[]> {
    return Item.findAll({
      where: {
        householdId: householdId
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
        {
          model: Household,
          as: 'household',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });
  }

  async findGlobalItems(): Promise<Item[]> {
    return Item.findAll({
      where: {
        householdId: {
          [Op.eq]: null
        }
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
        {
          model: Household,
          as: 'household',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });
  }

  async update(id: string, updateData: UpdateItemDto): Promise<Item | null> {
    const item = await Item.findByPk(id);
    if (!item) {
      return null;
    }

    await item.update(updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const item = await Item.findByPk(id);
    if (!item) {
      return false;
    }

    await item.destroy();
    return true;
  }

  async checkItemBelongsToHousehold(itemId: string, householdId: string): Promise<boolean> {
    const item = await Item.findOne({
      where: {
        id: itemId,
        householdId: {
          [Op.or]: [householdId, null] // Global items are accessible to all households
        }
      },
    });
    
    return !!item;
  }

  async checkDuplicateName(name: string, householdId: string, excludeId?: string): Promise<boolean> {
    const whereClause: any = {
      name: {
        [Op.iLike]: name.trim() // Case-insensitive comparison
      },
      householdId: householdId
    };

    // Exclude the current item when updating
    if (excludeId) {
      whereClause.id = {
        [Op.ne]: excludeId
      };
    }

    const existingItem = await Item.findOne({
      where: whereClause
    });

    return !!existingItem;
  }
} 