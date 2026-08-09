import { Op } from 'sequelize';
import { Item, User, Household } from '../models';
import { CreateItemDto, UpdateItemDto, GetItemsQueryDto } from '../types/ItemDto';
import { getReverseTranslationMap, getTranslatedName } from '../i18n/itemTranslations';
import { deleteImageFromCloudinary } from '../utils/imageUploader';
import { HouseholdActivityRepository } from './HouseholdActivityRepository';

// Personalized-search boost. Deliberately SATURATED so frequency can only
// re-order ties WITHIN a relevance band, never cross one: the smallest gap
// between bands (contains=100 → startsWith=500) is 400, and the max boost is
// 20*3 + 20*1 = 80. This preserves the ticket's rule that textual match stays
// dominant (a rare item found by full name is never buried by a frequent one).
const PERSONAL_WEIGHT = 3;
const HOUSEHOLD_WEIGHT = 1;
const PERSONAL_CAP = 20;
const HOUSEHOLD_CAP = 20;
const ACTIVITY_WINDOW_DAYS = 30;

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

  // Batch hydrate by id. Missing ids are simply absent from the result —
  // a suggestion referencing a deleted item is thereby skipped, not an error.
  async findByIds(ids: string[]): Promise<Item[]> {
    if (ids.length === 0) return [];
    return Item.findAll({
      where: { id: { [Op.in]: ids } },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        { model: Household, as: 'household', attributes: ['id', 'name'], required: false },
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
      personalized = false,
      userId,
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

        // Add conditions for matching names (since nameKey === name for seeded items)
        if (matchingNameKeys.length > 0) {
          searchConditions.push({
            name: {
              [Op.in]: matchingNameKeys
            }
          });
        }
      }

      whereClause[Op.or] = searchConditions;
    }

    // Fetch all matching items (without pagination) to calculate relevance scores
    const { rows: allItems, count: total } = await Item.findAndCountAll({
      where: whereClause,
      include: includeClause,
    });

    // If there's a search query, calculate relevance scores and sort
    if (search && allItems.length > 0) {
      const searchTerm = search.toLowerCase();
      const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);

      // Personalized boost map (best-effort: on failure, fall back to pure
      // textual ranking rather than failing the search).
      let scoreMap = new Map<string, { personalCount: number; householdCount: number }>();
      if (personalized && userId && householdId) {
        try {
          const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
          scoreMap = await new HouseholdActivityRepository().getScoreMap(householdId, userId, since);
        } catch (err) {
          console.error('ItemRepository: failed to load activity scores, ranking without boost', err);
        }
      }

      // Calculate relevance score for each item
      const itemsWithScores = allItems.map(item => {
        const itemName = item.name.toLowerCase();
        const translatedName = language ? getTranslatedName(item.name, language).toLowerCase() : '';
        const isHouseholdItem = householdId && item.householdId === householdId;
        
        let relevanceScore = 0;
        
        // Check exact match (highest priority)
        if (itemName === searchTerm || translatedName === searchTerm) {
          relevanceScore += 1000;
        }
        // Check starts with (high priority)
        else if (itemName.startsWith(searchTerm) || translatedName.startsWith(searchTerm)) {
          relevanceScore += 500;
        }
        // Check contains (medium priority)
        else if (itemName.includes(searchTerm) || translatedName.includes(searchTerm)) {
          relevanceScore += 100;
        }
        
        // Multi-word search: boost score if all words match
        if (searchWords.length > 1) {
          const allWordsMatch = searchWords.every(word => 
            itemName.includes(word) || translatedName.includes(word)
          );
          if (allWordsMatch) {
            relevanceScore += 50;
          }
        }
        
        // Prioritize household items
        if (isHouseholdItem) {
          relevanceScore += 200;
        }

        const score = scoreMap.get(item.id);
        if (score) {
          relevanceScore +=
            Math.min(score.personalCount, PERSONAL_CAP) * PERSONAL_WEIGHT +
            Math.min(score.householdCount, HOUSEHOLD_CAP) * HOUSEHOLD_WEIGHT;
        }

        return { item, relevanceScore };
      });
      
      // Sort by relevance score (descending), then alphabetically
      itemsWithScores.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return a.item.name.localeCompare(b.item.name);
      });
      
      // Extract items and apply pagination
      const sortedItems = itemsWithScores.map(({ item }) => item);
      const paginatedItems = sortedItems.slice(offset, offset + limit);
      
      return { items: paginatedItems, total };
    }
    
    // No search query - just apply pagination and alphabetical sorting
    const sortedItems = allItems.sort((a, b) => {
      // Prioritize household items when no search
      if (householdId) {
        const aIsHousehold = a.householdId === householdId;
        const bIsHousehold = b.householdId === householdId;
        if (aIsHousehold !== bIsHousehold) {
          return aIsHousehold ? -1 : 1;
        }
      }
      return a.name.localeCompare(b.name);
    });
    
    const paginatedItems = sortedItems.slice(offset, offset + limit);
    return { items: paginatedItems, total };
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

    // Delete the image from Cloudinary if it exists
    if (item.imageUrl) {
      try {
        await deleteImageFromCloudinary(item.imageUrl);
      } catch (error) {
        // Log error but don't fail the deletion if image deletion fails
        console.error(`Failed to delete image for item ${id}:`, error);
      }
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