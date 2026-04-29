import { MealRepository } from '../repositories/MealRepository';
import { RecipeRepository } from '../repositories/RecipeRepository';
import { ItemRepository } from '../repositories/ItemRepository';
import { ShoppingItemRepository } from '../repositories/ShoppingItemRepository';
import { StoredItemRepository } from '../repositories/StoredItemRepository';
import {
  CreateMealDto,
  UpdateMealDto,
  MealDto,
  MealsAvailabilityDto,
  MealsAvailabilityItemDto,
  ShoppingListItemDto,
} from '../types/MealDto';
import { CreateShoppingItemDto } from '../types/ItemDto';
import { Meal } from '../models/Meal';
import { StoredItem } from '../models/StoredItem';
import { Item } from '../models/Item';
import { NotFoundError, ValidationError } from '../errors/CustomErrors';
import {
  normalizeToBaseUnit,
  getBestDisplayUnit,
  convertToStorageUnit,
} from '../utils/unitConversion';

const EXPIRING_SOON_DAYS = 3;

export class MealService {
  private mealRepository: MealRepository;
  private recipeRepository: RecipeRepository;
  private itemRepository: ItemRepository;
  private shoppingItemRepository: ShoppingItemRepository;
  private storedItemRepository: StoredItemRepository;

  constructor() {
    this.mealRepository = new MealRepository();
    this.recipeRepository = new RecipeRepository();
    this.itemRepository = new ItemRepository();
    this.shoppingItemRepository = new ShoppingItemRepository();
    this.storedItemRepository = new StoredItemRepository();
  }

  async getMeals(householdId: string): Promise<MealDto[]> {
    const meals = await this.mealRepository.findByHousehold(householdId);
    return meals.map((m) => this.transformToDto(m));
  }

  async createMeal(householdId: string, data: CreateMealDto): Promise<MealDto> {
    this.validateMealData(data);

    const recipe = await this.recipeRepository.findById(data.recipeId, householdId);
    if (!recipe) {
      throw new NotFoundError('Recipe not found or does not belong to this household');
    }

    const meal = await this.mealRepository.create({
      householdId,
      recipeId: data.recipeId,
      servings: data.servings ?? recipe.servings,
    });

    const reloaded = await this.mealRepository.findById(meal.id, true);
    return this.transformToDto(reloaded!);
  }

  async updateMeal(id: string, householdId: string, data: UpdateMealDto): Promise<MealDto> {
    const meal = await this.mealRepository.findById(id, false);
    if (!meal || meal.householdId !== householdId) {
      throw new NotFoundError('Meal not found');
    }

    if (data.servings === undefined) {
      throw new ValidationError('Nothing to update');
    }
    if (data.servings < 1 || data.servings > 20) {
      throw new ValidationError('Servings must be between 1 and 20');
    }

    const updated = await this.mealRepository.updateServings(id, data.servings);
    if (!updated) throw new NotFoundError('Failed to update meal');
    return this.transformToDto(updated);
  }

  async deleteMeal(id: string, householdId: string): Promise<void> {
    const meal = await this.mealRepository.findById(id, false);
    if (!meal || meal.householdId !== householdId) {
      throw new NotFoundError('Meal not found');
    }
    await this.mealRepository.deleteAndRepack(id, householdId);
  }

  /**
   * Aggregates the ingredient needs of every meal in the household, compares
   * them to the current stock and flags items that are missing or expiring.
   */
  async getAvailability(householdId: string): Promise<MealsAvailabilityDto> {
    const meals = await this.mealRepository.findByHousehold(householdId);

    const totals = new Map<
      string,
      {
        itemId: string;
        itemName: string;
        category: string;
        neededInBaseUnit: number;
        baseUnit: string;
      }
    >();

    for (const meal of meals) {
      const recipe = await this.recipeRepository.findById(meal.recipeId, householdId);
      if (!recipe || !recipe.servings || recipe.servings <= 0) continue;

      for (const ingredient of recipe.ingredients || []) {
        if (
          ingredient.isFreeQuantity ||
          ingredient.quantity === null ||
          ingredient.quantity === undefined
        ) {
          continue;
        }
        const needed = (Number(ingredient.quantity) / recipe.servings) * meal.servings;
        const normalized = normalizeToBaseUnit(needed, ingredient.unit);
        const key = `${ingredient.itemId}|${normalized.unit}`;

        const item = (ingredient as any).item as Item | undefined;
        const itemName = item?.name ?? '';
        const category = item?.category ?? 'other';

        const existing = totals.get(key);
        if (existing) {
          existing.neededInBaseUnit += normalized.quantity;
        } else {
          totals.set(key, {
            itemId: ingredient.itemId,
            itemName,
            category,
            neededInBaseUnit: normalized.quantity,
            baseUnit: normalized.unit,
          });
        }
      }
    }

    const expiringItemIds = await this.findExpiringItemIds(householdId);
    const items: MealsAvailabilityItemDto[] = [];
    const expiringSoonSet = new Map<string, string>();

    for (const data of totals.values()) {
      const inStock = await this.storedItemRepository.getTotalQuantityByItem(
        data.itemId,
        householdId,
        data.baseUnit
      );
      const missing = Math.max(0, data.neededInBaseUnit - inStock);

      let displayed: { quantity: number; unit: string };
      if (
        data.baseUnit === 'ml' &&
        ['spices', 'grains', 'condiments'].includes(data.category)
      ) {
        displayed = convertToStorageUnit(data.neededInBaseUnit, data.baseUnit, data.category);
      } else {
        displayed = getBestDisplayUnit(data.neededInBaseUnit, data.baseUnit, true);
      }
      const ratio = displayed.quantity / data.neededInBaseUnit;

      items.push({
        itemId: data.itemId,
        itemName: data.itemName,
        needed: roundQuantity(data.neededInBaseUnit * ratio),
        inStock: roundQuantity(inStock * ratio),
        missing: roundQuantity(missing * ratio),
        unit: displayed.unit,
      });

      if (expiringItemIds.has(data.itemId)) {
        expiringSoonSet.set(data.itemId, data.itemName);
      }
    }

    items.sort((a, b) => a.itemName.localeCompare(b.itemName));

    return {
      totalIngredients: items.length,
      missingCount: items.filter((i) => i.missing > 0).length,
      inStockCount: items.filter((i) => i.inStock > 0).length,
      expiringSoon: Array.from(expiringSoonSet.entries()).map(([itemId, itemName]) => ({
        itemId,
        itemName,
      })),
      items,
    };
  }

  async generateShoppingList(
    householdId: string,
    createdBy: string
  ): Promise<ShoppingListItemDto[]> {
    const meals = await this.mealRepository.findByHousehold(householdId);

    const totals = new Map<
      string,
      {
        itemId: string;
        itemName: string;
        category: string;
        excludeFromShopping: boolean;
        neededInBaseUnit: number;
        baseUnit: string;
        recipes: string[];
      }
    >();

    for (const meal of meals) {
      const recipe = await this.recipeRepository.findById(meal.recipeId, householdId);
      if (!recipe || !recipe.servings || recipe.servings <= 0) continue;

      for (const ingredient of recipe.ingredients || []) {
        if (
          ingredient.isFreeQuantity ||
          ingredient.quantity === null ||
          ingredient.quantity === undefined
        ) {
          continue;
        }

        const needed = (Number(ingredient.quantity) / recipe.servings) * meal.servings;
        const normalized = normalizeToBaseUnit(needed, ingredient.unit);
        const key = `${ingredient.itemId}|${normalized.unit}`;

        const existing = totals.get(key);
        if (existing) {
          existing.neededInBaseUnit += normalized.quantity;
          if (!existing.recipes.includes(recipe.title)) {
            existing.recipes.push(recipe.title);
          }
        } else {
          const item = await this.itemRepository.findById(ingredient.itemId);
          if (!item) continue;
          totals.set(key, {
            itemId: item.id,
            itemName: item.name,
            category: item.category,
            excludeFromShopping: !!item.excludeFromShopping,
            neededInBaseUnit: normalized.quantity,
            baseUnit: normalized.unit,
            recipes: [recipe.title],
          });
        }
      }
    }

    const created: ShoppingListItemDto[] = [];
    for (const data of totals.values()) {
      if (data.excludeFromShopping) continue;
      const inStock = await this.storedItemRepository.getTotalQuantityByItem(
        data.itemId,
        householdId,
        data.baseUnit
      );
      const shortage = data.neededInBaseUnit - inStock;
      if (shortage <= 0) continue;

      let display: { quantity: number; unit: string };
      if (
        data.baseUnit === 'ml' &&
        ['spices', 'grains', 'condiments'].includes(data.category)
      ) {
        display = convertToStorageUnit(shortage, data.baseUnit, data.category);
      } else {
        display = getBestDisplayUnit(shortage, data.baseUnit, true);
      }

      try {
        const shoppingItemData: CreateShoppingItemDto = {
          itemId: data.itemId,
          householdId,
          quantity: display.quantity,
          unit: display.unit,
          createdBy,
          priority: 0,
        };
        await this.shoppingItemRepository.create(shoppingItemData);
        created.push({
          itemId: data.itemId,
          itemName: data.itemName,
          totalQuantity: display.quantity,
          unit: display.unit,
          recipes: data.recipes,
        });
      } catch (error) {
        console.error(`Error creating shopping item for ${data.itemName}:`, error);
      }
    }

    return created.sort((a, b) => a.itemName.localeCompare(b.itemName));
  }

  private async findExpiringItemIds(householdId: string): Promise<Set<string>> {
    const expiring = await this.storedItemRepository.findExpiring(householdId, EXPIRING_SOON_DAYS);
    const ids = new Set<string>();
    for (const stored of expiring) {
      ids.add(stored.itemId);
    }
    return ids;
  }

  private validateMealData(data: CreateMealDto): void {
    if (!data.recipeId) {
      throw new ValidationError('recipeId is required');
    }
    if (data.servings !== undefined && (data.servings < 1 || data.servings > 20)) {
      throw new ValidationError('Servings must be between 1 and 20');
    }
  }

  private transformToDto(meal: Meal): MealDto {
    const recipe = (meal as any).recipe;
    return {
      id: meal.id,
      householdId: meal.householdId,
      recipeId: meal.recipeId,
      servings: meal.servings,
      position: meal.position,
      createdAt: meal.createdAt.toISOString(),
      updatedAt: meal.updatedAt.toISOString(),
      recipe: recipe
        ? {
            id: recipe.id,
            title: recipe.title,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            servings: recipe.servings,
            tags: recipe.tags || [],
            imageUrl: recipe.imageUrl || undefined,
          }
        : undefined,
    };
  }
}

function roundQuantity(n: number): number {
  return Math.round(n * 1000) / 1000;
}
