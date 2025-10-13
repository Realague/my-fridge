import { Op } from 'sequelize';
import { Item, User, Household } from '../models';
import { CreateItemDto, UpdateItemDto, GetItemsQueryDto } from '../types/ItemDto';
import { getReverseTranslationMap } from '../i18n/itemTranslations';

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
      language,
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

    // Search functionality with translation support
    if (search) {
      const searchConditions: any[] = [
        { name: { [Op.iLike]: `%${search}%` } }
      ];

      // If language is provided, also search by translated names
      if (language) {
        const reverseTranslationMap = getReverseTranslationMap(language);
        const searchTerm = search.toLowerCase();
        
        // Find matching nameKeys for the search term
        const matchingNameKeys: string[] = [];
        for (const [translatedName, nameKey] of Object.entries(reverseTranslationMap)) {
          if (translatedName.includes(searchTerm)) {
            matchingNameKeys.push(nameKey);
          }
        }

        // Add conditions for matching nameKeys
        if (matchingNameKeys.length > 0) {
          searchConditions.push({
            nameKey: {
              [Op.in]: matchingNameKeys
            }
          });
        }
      }

      whereClause[Op.or] = searchConditions;
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