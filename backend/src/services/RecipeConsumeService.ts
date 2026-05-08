import sequelize from '../config/database'; 
import { Recipe } from '../models/Recipe';
import { RecipeIngredient } from '../models/RecipeIngredient';
import { StoredItem } from '../models/StoredItem';
import { Item } from '../models/Item';
import { StorageArea } from '../models/StorageArea';
import { User } from '../models/User';
import { NotFoundError, ValidationError } from '../errors/CustomErrors';
import {
  normalizeToBaseUnit,
  convertQuantity,
  getUnitType,
  UnitType,
  getBestDisplayUnit,
  convertToStorageUnit,
} from '../utils/unitConversion';

export interface ConsumePreviewIngredient {
  recipeIngredientId: string;
  itemId: string;
  itemName: string;
  itemCategory: string;
  requiredQuantity: number;
  requiredUnit: string;
  originalQuantity: number;
  originalUnit: string;
  availableStoredItems: ConsumePreviewStoredItem[];
  totalAvailable: number;
  totalAvailableUnit: string;
  hasEnough: boolean;
  canCompare: boolean;
  suggestedDeductions: SuggestedDeduction[];
}

export interface ConsumePreviewStoredItem {
  storedItemId: string;
  storageAreaId: string;
  storageAreaName: string;
  storageAreaEmoji: string | null;
  quantity: number;
  unit: string;
  normalizedQuantity: number;
  normalizedUnit: string;
  expirationDate: string | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export interface SuggestedDeduction {
  storedItemId: string;
  quantity: number;
  unit: string;
}

export interface ConsumePreviewResult {
  recipeId: string;
  recipeTitle: string;
  recipeServings: number;
  requestedServings: number;
  ingredients: ConsumePreviewIngredient[];
}

export interface ConsumeDeduction {
  storedItemId: string;
  quantity: number;
  unit: string;
}

export interface ConsumeResult {
  consumed: Array<{
    storedItemId: string;
    itemName: string;
    quantityDeducted: number;
    unit: string;
    remainingQuantity: number | null;
    deleted: boolean;
  }>;
}

export class RecipeConsumeService {

  async getConsumePreview(
    recipeId: string,
    householdId: string,
    servings?: number
  ): Promise<ConsumePreviewResult> {
    const recipe = await Recipe.findOne({
      where: { id: recipeId, householdId },
      include: [
        {
          model: RecipeIngredient,
          as: 'ingredients',
          include: [
            {
              model: Item,
              as: 'item',
            },
          ],
        },
      ],
    });

    if (!recipe) {
      throw new NotFoundError('Recipe not found');
    }

    const requestedServings = servings ?? recipe.servings;
    const scale = requestedServings / recipe.servings;

    const ingredients: ConsumePreviewIngredient[] = [];

    for (const ingredient of recipe.ingredients ?? []) {
      const item = ingredient.item;
      if (!item) continue;

      // Free-quantity ingredients have no measurable amount — skip stock
      // comparison entirely. They will not block recipe consumption and will
      // not generate shopping list entries.
      if (ingredient.isFreeQuantity || ingredient.quantity === null || ingredient.quantity === undefined) {
        continue;
      }

      const scaledQuantity = Number(ingredient.quantity) * scale;
      const originalUnit = ingredient.unit;

      const normalized = normalizeToBaseUnit(scaledQuantity, originalUnit);
      const storageDisplay = convertToStorageUnit(scaledQuantity, originalUnit, item.category);

      const storedItems = await StoredItem.findAll({
        where: { itemId: ingredient.itemId, householdId },
        include: [
          { model: StorageArea, as: 'storageArea' },
          { model: Item, as: 'item' },
        ],
        order: [
          ['expirationDate', 'ASC NULLS LAST'],
          ['createdAt', 'ASC'],
        ],
      });

      const requiredUnit = normalized.unit;
      const requiredUnitType = getUnitType(requiredUnit);

      const availableStoredItems: ConsumePreviewStoredItem[] = [];
      let totalAvailable = 0;
      let canCompare = true;

      for (const si of storedItems) {
        const siNormalized = normalizeToBaseUnit(Number(si.quantity), si.unit);
        const siUnitType = getUnitType(siNormalized.unit);

        const unitsCompatible =
          requiredUnitType === siUnitType &&
          requiredUnitType !== UnitType.OTHER;

        if (!unitsCompatible && requiredUnitType !== UnitType.COUNT) {
          canCompare = false;
        }

        if (unitsCompatible || requiredUnitType === UnitType.COUNT) {
          totalAvailable += siNormalized.quantity;
        }

        availableStoredItems.push({
          storedItemId: si.id,
          storageAreaId: si.storageAreaId,
          storageAreaName: si.storageArea?.name ?? '',
          storageAreaEmoji: si.storageArea?.emoji ?? null,
          quantity: Number(si.quantity),
          unit: si.unit,
          normalizedQuantity: siNormalized.quantity,
          normalizedUnit: siNormalized.unit,
          expirationDate: si.expirationDate != null
            ? new Date(si.expirationDate).toISOString().split('T')[0]!
            : null,
          isExpired: si.isExpired(),
          isExpiringSoon: si.isExpiringSoon(),
        });
      }

      const hasEnough = canCompare && totalAvailable >= normalized.quantity;

      const suggestedDeductions = this.computeSuggestedDeductions(
        normalized.quantity,
        normalized.unit,
        availableStoredItems
      );

      const display = getBestDisplayUnit(normalized.quantity, normalized.unit, true);

      ingredients.push({
        recipeIngredientId: ingredient.id,
        itemId: ingredient.itemId,
        itemName: item.name,
        itemCategory: item.category,
        requiredQuantity: display.quantity,
        requiredUnit: display.unit,
        originalQuantity: scaledQuantity,
        originalUnit,
        availableStoredItems,
        totalAvailable,
        totalAvailableUnit: normalized.unit,
        hasEnough,
        canCompare,
        suggestedDeductions,
      });
    }

    return {
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeServings: recipe.servings,
      requestedServings,
      ingredients,
    };
  }

  async consumeIngredients(
    recipeId: string,
    householdId: string,
    deductions: ConsumeDeduction[]
  ): Promise<ConsumeResult> {
    if (!deductions || deductions.length === 0) {
      throw new ValidationError('No deductions provided');
    }

    const recipe = await Recipe.findOne({
      where: { id: recipeId, householdId },
    });

    if (!recipe) {
      throw new NotFoundError('Recipe not found');
    }

    const transaction = await sequelize.transaction();

    try {
      const consumed: ConsumeResult['consumed'] = [];

      for (const deduction of deductions) {
        const storedItem = await StoredItem.findOne({
          where: { id: deduction.storedItemId, householdId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!storedItem) {
          throw new NotFoundError(
            `Stored item ${deduction.storedItemId} not found`
          );
        }

        const item = await Item.findByPk(storedItem.itemId, { transaction });
        const itemName = item?.name ?? '';

        const deductionNormalized = normalizeToBaseUnit(
          deduction.quantity,
          deduction.unit
        );
        const storedNormalized = normalizeToBaseUnit(
          Number(storedItem.quantity),
          storedItem.unit
        );

        if (deductionNormalized.unit !== storedNormalized.unit) {
          const converted = convertQuantity(
            deduction.quantity,
            deduction.unit,
            storedItem.unit
          );
          if (converted === null) {
            throw new ValidationError(
              `Cannot convert ${deduction.unit} to ${storedItem.unit} for item ${itemName || storedItem.id}`
            );
          }

          const remaining = Number(storedItem.quantity) - converted;

          if (remaining <= 0.001) {
            await storedItem.destroy({ transaction });
            consumed.push({
              storedItemId: storedItem.id,
              itemName,
              quantityDeducted: Number(storedItem.quantity),
              unit: storedItem.unit,
              remainingQuantity: null,
              deleted: true,
            });
          } else {
            await storedItem.update({ quantity: remaining }, { transaction });
            consumed.push({
              storedItemId: storedItem.id,
              itemName,
              quantityDeducted: converted,
              unit: storedItem.unit,
              remainingQuantity: remaining,
              deleted: false,
            });
          }
        } else {
          const remaining = storedNormalized.quantity - deductionNormalized.quantity;

          if (remaining <= 0.001) {
            await storedItem.destroy({ transaction });
            consumed.push({
              storedItemId: storedItem.id,
              itemName,
              quantityDeducted: Number(storedItem.quantity),
              unit: storedItem.unit,
              remainingQuantity: null,
              deleted: true,
            });
          } else {
            const displayRemaining = getBestDisplayUnit(remaining, storedNormalized.unit, true);
            const convertedBack = convertQuantity(
              remaining,
              storedNormalized.unit,
              storedItem.unit
            );
            const newQuantity = convertedBack ?? displayRemaining.quantity;

            await storedItem.update({ quantity: newQuantity }, { transaction });
            consumed.push({
              storedItemId: storedItem.id,
              itemName,
              quantityDeducted: deduction.quantity,
              unit: deduction.unit,
              remainingQuantity: newQuantity,
              deleted: false,
            });
          }
        }
      }

      await transaction.commit();
      return { consumed };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private computeSuggestedDeductions(
    requiredQuantity: number,
    requiredUnit: string,
    availableItems: ConsumePreviewStoredItem[]
  ): SuggestedDeduction[] {
    const suggestions: SuggestedDeduction[] = [];
    let remaining = requiredQuantity;
    const requiredUnitType = getUnitType(requiredUnit);

    const sorted = [...availableItems].sort((a, b) => {
      if (a.isExpiringSoon && !b.isExpiringSoon) return -1;
      if (!a.isExpiringSoon && b.isExpiringSoon) return 1;
      if (a.expirationDate && b.expirationDate) {
        return a.expirationDate.localeCompare(b.expirationDate);
      }
      if (a.expirationDate && !b.expirationDate) return -1;
      if (!a.expirationDate && b.expirationDate) return 1;
      return 0;
    });

    for (const item of sorted) {
      if (remaining <= 0.001) break;

      const itemUnitType = getUnitType(item.normalizedUnit);
      if (itemUnitType !== requiredUnitType) continue;

      const available = item.normalizedQuantity;
      const toDeduct = Math.min(available, remaining);

      const inStoredUnit = convertQuantity(toDeduct, requiredUnit, item.unit);

      if (inStoredUnit !== null && inStoredUnit > 0) {
        suggestions.push({
          storedItemId: item.storedItemId,
          quantity: Math.round(inStoredUnit * 1000) / 1000,
          unit: item.unit,
        });
        remaining -= toDeduct;
      } else if (requiredUnit === item.normalizedUnit) {
        const deductInOriginal = convertQuantity(toDeduct, item.normalizedUnit, item.unit);
        if (deductInOriginal !== null) {
          suggestions.push({
            storedItemId: item.storedItemId,
            quantity: Math.round(deductInOriginal * 1000) / 1000,
            unit: item.unit,
          });
          remaining -= toDeduct;
        }
      }
    }

    return suggestions;
  }
}
