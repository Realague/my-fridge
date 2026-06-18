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
  ShoppingPreviewDto,
  ShoppingPreviewItemDto,
  CommitShoppingItemInputDto,
  CommitShoppingMergeDto,
  MealRemovalImpactDto,
  MealRemovalShoppingItemDto,
  MealRemovalNoImpactItemDto,
  MealRemovalActionDto,
} from '../types/MealDto';
import { CreateShoppingItemDto } from '../types/ItemDto';
import { Meal } from '../models/Meal';
import { Item } from '../models/Item';
import { ItemCategory } from '../types/enums';
import { NotFoundError, ValidationError } from '../errors/CustomErrors';
import {
  normalizeToBaseUnit,
  getBestDisplayUnit,
  convertToStorageUnit,
  convertQuantity,
} from '../utils/unitConversion';

const EXPIRING_SOON_DAYS = 3;

const BASIC_CATEGORIES = new Set<string>([
  ItemCategory.SPICES,
  ItemCategory.CONDIMENTS,
]);

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
   * Marks a meal as cooked. The row stays in the table (for stats) but the
   * meal disappears from the active plan. Idempotent: marking an already
   * cooked meal is a no-op that still returns the dto.
   */
  async markMealCooked(id: string, householdId: string): Promise<MealDto> {
    const meal = await this.mealRepository.findById(id, false);
    if (!meal || meal.householdId !== householdId) {
      throw new NotFoundError('Meal not found');
    }
    const updated = await this.mealRepository.markCooked(id, householdId);
    if (!updated) throw new NotFoundError('Meal not found');
    return this.transformToDto(updated);
  }

  async getAvailability(householdId: string): Promise<MealsAvailabilityDto> {
    const totals = await this.aggregateNeeds(householdId);
    const expiringItemIds = await this.findExpiringItemIds(householdId);

    const items: MealsAvailabilityItemDto[] = [];
    const expiringSoonSet = new Map<string, string>();
    const onShoppingListItemIds = new Set<string>();

    for (const data of totals.values()) {
      const inStock = await this.storedItemRepository.getTotalQuantityByItem(
        data.itemId,
        householdId,
        data.baseUnit
      );
      const onShoppingList = await this.shoppingItemRepository.getActiveQuantityByItem(
        data.itemId,
        householdId,
        data.baseUnit
      );
      // `missing` reflects the real shortage: stock + active shopping list both
      // count as covered. But `inStock` keeps its literal meaning — what's
      // physically in the fridge — so the UI can label it accurately.
      const missing = Math.max(0, data.neededInBaseUnit - inStock - onShoppingList);
      const displayed = this.toDisplayUnit(data.neededInBaseUnit, data.baseUnit, data.category);
      const ratio = displayed.quantity / Math.max(data.neededInBaseUnit, 1e-9);

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
      if (onShoppingList > 0) {
        onShoppingListItemIds.add(data.itemId);
      }
    }

    items.sort((a, b) => a.itemName.localeCompare(b.itemName));

    return {
      totalIngredients: items.length,
      missingCount: items.filter((i) => i.missing > 0).length,
      inStockCount: items.filter((i) => i.inStock > 0).length,
      onShoppingListCount: onShoppingListItemIds.size,
      expiringSoon: Array.from(expiringSoonSet.entries()).map(([itemId, itemName]) => ({
        itemId,
        itemName,
      })),
      items,
    };
  }

  /**
   * Compute the shopping preview from the current meals: for each ingredient,
   * compare the total needed amount with the actual stock and produce three
   * groups (toBuy, inStock, basics). Each item also surfaces what is already
   * present in the active shopping list so the UI can pre-compute the merge.
   */
  async getShoppingPreview(householdId: string): Promise<ShoppingPreviewDto> {
    const totals = await this.aggregateNeeds(householdId);
    const toBuy: ShoppingPreviewItemDto[] = [];
    const inStock: ShoppingPreviewItemDto[] = [];
    const inShoppingList: ShoppingPreviewItemDto[] = [];
    const basics: ShoppingPreviewItemDto[] = [];

    for (const data of totals.values()) {
      if (data.excludeFromShopping) continue;

      const stockQty = await this.storedItemRepository.getTotalQuantityByItem(
        data.itemId,
        householdId,
        data.baseUnit
      );

      // What's already on the active shopping list (any unit, normalized).
      const existingShoppingNormalized =
        await this.shoppingItemRepository.getActiveQuantityByItem(
          data.itemId,
          householdId,
          data.baseUnit
        );

      // Stock + already-on-list both reduce what we still need to buy.
      const shortage = Math.max(
        0,
        data.neededInBaseUnit - stockQty - existingShoppingNormalized
      );

      const displayed = this.toDisplayUnit(
        Math.max(shortage, data.neededInBaseUnit, 1e-9),
        data.baseUnit,
        data.category
      );

      const refQty = Math.max(shortage, data.neededInBaseUnit, 1e-9);
      const ratio = displayed.quantity / refQty;
      const neededDisp = roundQuantity(data.neededInBaseUnit * ratio);
      const inStockDisp = roundQuantity(stockQty * ratio);
      const toBuyDisp = roundQuantity(shortage * ratio);
      const existingShoppingDisp = roundQuantity(existingShoppingNormalized * ratio);

      const existing = await this.shoppingItemRepository.getDuplicateShoppingItem(
        data.itemId,
        householdId,
        displayed.unit,
        false
      );

      const previewItem: ShoppingPreviewItemDto = {
        itemId: data.itemId,
        itemName: data.itemName,
        itemCategory: data.category,
        itemHouseholdId: data.itemHouseholdId,
        itemImageUrl: data.itemImageUrl,
        needed: neededDisp,
        inStock: inStockDisp,
        toBuy: toBuyDisp,
        unit: displayed.unit,
        recipes: data.recipes,
        existingShoppingQty: existingShoppingDisp,
        shoppingItemId: existing?.id,
      };

      if (BASIC_CATEGORIES.has(data.category)) {
        basics.push(previewItem);
      } else if (shortage <= 0) {
        // Already fully covered. Distinguish "in the fridge" from "already
        // queued in the shopping list" so the UI can be specific.
        if (stockQty >= data.neededInBaseUnit) {
          inStock.push(previewItem);
        } else {
          inShoppingList.push(previewItem);
        }
      } else {
        toBuy.push(previewItem);
      }
    }

    const byName = (a: ShoppingPreviewItemDto, b: ShoppingPreviewItemDto) =>
      a.itemName.localeCompare(b.itemName);
    toBuy.sort(byName);
    inStock.sort(byName);
    inShoppingList.sort(byName);
    basics.sort(byName);

    return { toBuy, inStock, inShoppingList, basics };
  }

  /**
   * Persist the user-confirmed selection: for each item, either create a new
   * ShoppingItem or merge the quantity into the existing one (same itemId,
   * same unit, not completed). Returns a summary of the merge so the UI can
   * recap exactly what changed.
   */
  async commitShopping(
    householdId: string,
    createdBy: string,
    items: CommitShoppingItemInputDto[]
  ): Promise<CommitShoppingMergeDto> {
    if (!Array.isArray(items)) {
      throw new ValidationError('items must be an array');
    }
    const newItems: ShoppingListItemDto[] = [];
    const mergedItems: Array<ShoppingListItemDto & { previousQuantity: number }> = [];
    const alreadyCoveredItems: ShoppingListItemDto[] = [];

    for (const input of items) {
      if (!input?.itemId || !input.unit) continue;
      const quantity = Number(input.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;

      const item = await this.itemRepository.findById(input.itemId);
      if (!item) continue;

      const existing = await this.shoppingItemRepository.getDuplicateShoppingItem(
        input.itemId,
        householdId,
        input.unit,
        false
      );

      if (existing) {
        const previousQuantity = Number(existing.quantity);
        if (previousQuantity >= quantity) {
          alreadyCoveredItems.push({
            itemId: input.itemId,
            itemName: item.name,
            totalQuantity: previousQuantity,
            unit: input.unit,
            recipes: input.recipes ?? [],
          });
          continue;
        }
        const newQuantity = roundQuantity(previousQuantity + quantity);
        await this.shoppingItemRepository.update(existing.id, { quantity: newQuantity });
        mergedItems.push({
          itemId: input.itemId,
          itemName: item.name,
          totalQuantity: newQuantity,
          previousQuantity,
          unit: input.unit,
          recipes: input.recipes ?? [],
        });
      } else {
        const created: CreateShoppingItemDto = {
          itemId: input.itemId,
          householdId,
          quantity: roundQuantity(quantity),
          unit: input.unit,
          createdBy,
          priority: 0,
        };
        await this.shoppingItemRepository.create(created);
        newItems.push({
          itemId: input.itemId,
          itemName: item.name,
          totalQuantity: roundQuantity(quantity),
          unit: input.unit,
          recipes: input.recipes ?? [],
        });
      }
    }

    return { newItems, mergedItems, alreadyCoveredItems };
  }

  /**
   * Backward-compat: cached PWA bundles still call the legacy
   * `/meals/shopping-list` and `/meal-plans/(generate-)shopping-list` endpoints
   * which used to auto-commit everything. We replicate that behavior so the
   * old clients keep working until their service worker refreshes.
   */
  async autoCommitFromPreview(
    householdId: string,
    createdBy: string
  ): Promise<CommitShoppingMergeDto> {
    const preview = await this.getShoppingPreview(householdId);
    const items: CommitShoppingItemInputDto[] = preview.toBuy.map((it) => ({
      itemId: it.itemId,
      quantity: it.toBuy,
      unit: it.unit,
      recipes: it.recipes,
    }));
    return this.commitShopping(householdId, createdBy, items);
  }

  /**
   * Compute the impact of removing a single meal from the household plan:
   * which shopping list items would be removed, reduced, already purchased,
   * or have no impact (covered by stock). The recipe's ingredients are
   * compared to what other planned meals still need.
   */
  async getRemovalImpact(mealId: string, householdId: string): Promise<MealRemovalImpactDto> {
    const meal = await this.mealRepository.findById(mealId, true);
    if (!meal || meal.householdId !== householdId) {
      throw new NotFoundError('Meal not found');
    }
    const recipe = await this.recipeRepository.findById(meal.recipeId, householdId);
    if (!recipe || !recipe.servings || recipe.servings <= 0) {
      // Recipe missing — nothing to recap, just allow removal.
      return {
        mealId,
        recipeTitle: (meal as any).recipe?.title ?? '',
        toRemove: [],
        toReduce: [],
        alreadyPurchased: [],
        noImpact: [],
      };
    }

    // Per-ingredient need for this meal, in baseUnit.
    type Need = {
      itemId: string;
      itemName: string;
      itemHouseholdId: string | null;
      itemImageUrl: string | null;
      category: string;
      excludeFromShopping: boolean;
      mealNeedBase: number;
      otherNeedBase: number;
      otherRecipes: string[];
      baseUnit: string;
    };
    const needs = new Map<string, Need>();

    for (const ingredient of recipe.ingredients || []) {
      if (
        ingredient.isFreeQuantity ||
        ingredient.quantity === null ||
        ingredient.quantity === undefined
      ) {
        continue;
      }
      const item = (ingredient as any).item as Item | undefined
        ?? (await this.itemRepository.findById(ingredient.itemId));
      if (!item) continue;
      const needed = (Number(ingredient.quantity) / recipe.servings) * meal.servings;
      const normalized = normalizeToBaseUnit(needed, ingredient.unit);
      const key = `${ingredient.itemId}|${normalized.unit}`;
      const existing = needs.get(key);
      if (existing) {
        existing.mealNeedBase += normalized.quantity;
      } else {
        needs.set(key, {
          itemId: item.id,
          itemName: item.name,
          itemHouseholdId: (item as any).householdId ?? null,
          itemImageUrl: (item as any).imageUrl ?? null,
          category: item.category,
          excludeFromShopping: !!item.excludeFromShopping,
          mealNeedBase: normalized.quantity,
          otherNeedBase: 0,
          otherRecipes: [],
          baseUnit: normalized.unit,
        });
      }
    }

    // Aggregate the same ingredients across the *other* meals (everything
    // except the one being removed) so we know whether each is shared.
    const otherMeals = (await this.mealRepository.findByHousehold(householdId)).filter(
      (m) => m.id !== mealId
    );
    for (const other of otherMeals) {
      const otherRecipe = await this.recipeRepository.findById(other.recipeId, householdId);
      if (!otherRecipe || !otherRecipe.servings || otherRecipe.servings <= 0) continue;
      for (const ingredient of otherRecipe.ingredients || []) {
        if (
          ingredient.isFreeQuantity ||
          ingredient.quantity === null ||
          ingredient.quantity === undefined
        ) {
          continue;
        }
        const otherNeeded =
          (Number(ingredient.quantity) / otherRecipe.servings) * other.servings;
        const normalized = normalizeToBaseUnit(otherNeeded, ingredient.unit);
        const key = `${ingredient.itemId}|${normalized.unit}`;
        const need = needs.get(key);
        if (need) {
          need.otherNeedBase += normalized.quantity;
          if (!need.otherRecipes.includes(otherRecipe.title)) {
            need.otherRecipes.push(otherRecipe.title);
          }
        }
      }
    }

    const toRemove: MealRemovalShoppingItemDto[] = [];
    const toReduce: MealRemovalShoppingItemDto[] = [];
    const alreadyPurchased: MealRemovalShoppingItemDto[] = [];
    const noImpact: MealRemovalNoImpactItemDto[] = [];

    for (const need of needs.values()) {
      if (need.excludeFromShopping) continue;
      const displayed = this.toDisplayUnit(need.mealNeedBase, need.baseUnit, need.category);
      const ratio = displayed.quantity / Math.max(need.mealNeedBase, 1e-9);
      const mealNeedDisplay = roundQuantity(need.mealNeedBase * ratio);

      const activeShop = await this.shoppingItemRepository.getDuplicateShoppingItem(
        need.itemId,
        householdId,
        displayed.unit,
        false
      );
      const completedShop = await this.shoppingItemRepository.getDuplicateShoppingItem(
        need.itemId,
        householdId,
        displayed.unit,
        true
      );

      // 1) Already purchased: report it as informational. The user can opt in
      //    to remove it from the list.
      if (completedShop) {
        const completedQty = Number(completedShop.quantity);
        alreadyPurchased.push({
          shoppingItemId: completedShop.id,
          itemId: need.itemId,
          itemName: need.itemName,
          itemHouseholdId: need.itemHouseholdId,
          itemImageUrl: need.itemImageUrl,
          unit: displayed.unit,
          currentQuantity: completedQty,
          reductionQuantity: Math.min(mealNeedDisplay, completedQty),
          remainingQuantity: Math.max(0, completedQty - mealNeedDisplay),
          isCompleted: true,
        });
      }

      // 2) Active shopping item: removal or reduction depending on whether
      //    other meals still need this ingredient.
      if (activeShop) {
        const currentQty = Number(activeShop.quantity);
        const reduction = Math.min(mealNeedDisplay, currentQty);
        const remaining = Math.max(0, currentQty - reduction);
        const entry: MealRemovalShoppingItemDto = {
          shoppingItemId: activeShop.id,
          itemId: need.itemId,
          itemName: need.itemName,
          itemHouseholdId: need.itemHouseholdId,
          itemImageUrl: need.itemImageUrl,
          unit: displayed.unit,
          currentQuantity: currentQty,
          reductionQuantity: reduction,
          remainingQuantity: remaining,
        };
        if (need.otherNeedBase > 0) {
          entry.otherRecipes = need.otherRecipes;
          toReduce.push(entry);
        } else {
          toRemove.push(entry);
        }
      } else if (!completedShop) {
        // 3) Neither active nor completed shopping item: came from stock.
        noImpact.push({
          itemId: need.itemId,
          itemName: need.itemName,
          itemHouseholdId: need.itemHouseholdId,
          itemImageUrl: need.itemImageUrl,
          needed: mealNeedDisplay,
          unit: displayed.unit,
        });
      }
    }

    const sortByName = (
      a: { itemName: string },
      b: { itemName: string }
    ) => a.itemName.localeCompare(b.itemName);
    toRemove.sort(sortByName);
    toReduce.sort(sortByName);
    alreadyPurchased.sort(sortByName);
    noImpact.sort(sortByName);

    return {
      mealId,
      recipeTitle: recipe.title,
      toRemove,
      toReduce,
      alreadyPurchased,
      noImpact,
    };
  }

  /**
   * Apply the user-confirmed removal: each action targets a ShoppingItem and
   * either deletes it ('remove'), updates its quantity ('reduce') or leaves
   * it untouched ('keep'). Then the meal itself is removed and positions
   * are repacked.
   */
  async confirmRemoval(
    mealId: string,
    householdId: string,
    actions: MealRemovalActionDto[]
  ): Promise<void> {
    const meal = await this.mealRepository.findById(mealId, false);
    if (!meal || meal.householdId !== householdId) {
      throw new NotFoundError('Meal not found');
    }

    for (const action of actions || []) {
      if (!action?.shoppingItemId) continue;
      const shoppingItem = await this.shoppingItemRepository.findById(action.shoppingItemId);
      if (!shoppingItem || shoppingItem.householdId !== householdId) continue;

      if (action.action === 'remove') {
        await this.shoppingItemRepository.delete(action.shoppingItemId);
      } else if (action.action === 'reduce') {
        const newQty = Number(action.newQuantity);
        if (!Number.isFinite(newQty) || newQty <= 0) {
          await this.shoppingItemRepository.delete(action.shoppingItemId);
        } else {
          await this.shoppingItemRepository.update(action.shoppingItemId, {
            quantity: roundQuantity(newQty),
          });
        }
      }
      // 'keep' = no-op
    }

    await this.mealRepository.deleteAndRepack(mealId, householdId);
  }

  // ——— Helpers ———

  private async aggregateNeeds(householdId: string) {
    const meals = await this.mealRepository.findByHousehold(householdId);
    const totals = new Map<
      string,
      {
        itemId: string;
        itemName: string;
        itemHouseholdId: string | null;
        itemImageUrl: string | null;
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
          const item = (ingredient as any).item as Item | undefined
            ?? (await this.itemRepository.findById(ingredient.itemId));
          if (!item) continue;
          totals.set(key, {
            itemId: item.id,
            itemName: item.name,
            itemHouseholdId: (item as any).householdId ?? null,
            itemImageUrl: (item as any).imageUrl ?? null,
            category: item.category,
            excludeFromShopping: !!item.excludeFromShopping,
            neededInBaseUnit: normalized.quantity,
            baseUnit: normalized.unit,
            recipes: [recipe.title],
          });
        }
      }
    }

    return totals;
  }

  private toDisplayUnit(quantityInBaseUnit: number, baseUnit: string, category: string) {
    if (
      baseUnit === 'ml' &&
      ['spices', 'grains', 'condiments'].includes(category)
    ) {
      return convertToStorageUnit(quantityInBaseUnit, baseUnit, category);
    }
    return getBestDisplayUnit(quantityInBaseUnit, baseUnit, true);
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
      cookedAt: meal.cookedAt ? meal.cookedAt.toISOString() : null,
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
