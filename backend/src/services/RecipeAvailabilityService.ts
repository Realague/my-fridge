import { Recipe } from '../models/Recipe';
import { RecipeIngredient } from '../models/RecipeIngredient';
import { Item } from '../models/Item';
import { StoredItemRepository } from '../repositories/StoredItemRepository';
import { RecipeAvailabilityDto } from '../types/MealDto';
import { normalizeToBaseUnit } from '../utils/unitConversion';

const EXPIRING_SOON_DAYS = 3;

export class RecipeAvailabilityService {
  private storedItemRepository: StoredItemRepository;

  constructor() {
    this.storedItemRepository = new StoredItemRepository();
  }

  async getRecipesAvailability(householdId: string): Promise<RecipeAvailabilityDto[]> {
    const recipes = await Recipe.findAll({
      where: { householdId },
      include: [
        {
          model: RecipeIngredient,
          as: 'ingredients',
          include: [{ model: Item, as: 'item', attributes: ['id', 'name'] }],
        },
      ],
    });

    const expiring = await this.storedItemRepository.findExpiring(householdId, EXPIRING_SOON_DAYS);
    const expiringByItemId = new Map<string, string>();
    for (const stored of expiring) {
      const itemName = (stored as any).item?.name ?? '';
      if (!expiringByItemId.has(stored.itemId)) {
        expiringByItemId.set(stored.itemId, itemName);
      }
    }

    const stockCache = new Map<string, number>();
    const getStock = async (itemId: string, baseUnit: string): Promise<number> => {
      const key = `${itemId}|${baseUnit}`;
      if (stockCache.has(key)) return stockCache.get(key)!;
      const qty = await this.storedItemRepository.getTotalQuantityByItem(
        itemId,
        householdId,
        baseUnit
      );
      stockCache.set(key, qty);
      return qty;
    };

    const results: RecipeAvailabilityDto[] = [];
    for (const recipe of recipes) {
      let missingCount = 0;
      const expiringNames: string[] = [];

      const servings = recipe.servings || 1;
      const ingredients = (recipe as any).ingredients as RecipeIngredient[] | undefined;

      for (const ingredient of ingredients || []) {
        if (
          ingredient.isFreeQuantity ||
          ingredient.quantity === null ||
          ingredient.quantity === undefined
        ) {
          continue;
        }
        const needed = (Number(ingredient.quantity) / servings) * servings;
        const normalized = normalizeToBaseUnit(needed, ingredient.unit);
        const inStock = await getStock(ingredient.itemId, normalized.unit);
        if (inStock < normalized.quantity) {
          missingCount += 1;
        }

        if (expiringByItemId.has(ingredient.itemId)) {
          const name = expiringByItemId.get(ingredient.itemId)!;
          if (!expiringNames.includes(name)) expiringNames.push(name);
        }
      }

      let status: 'haveAll' | 'missing' | 'usesExpiring';
      if (expiringNames.length > 0) {
        status = 'usesExpiring';
      } else if (missingCount === 0) {
        status = 'haveAll';
      } else {
        status = 'missing';
      }

      results.push({
        recipeId: recipe.id,
        status,
        missingCount,
        expiringIngredients: expiringNames,
      });
    }

    return results;
  }
}
