import { Transaction } from 'sequelize';
import sequelize from '../config/database';
import { Recipe } from '../models/Recipe';
import { RecipeIngredient } from '../models/RecipeIngredient';
import { StoredItem } from '../models/StoredItem';
import { Item } from '../models/Item';
import { StorageArea } from '../models/StorageArea';
import { User } from '../models/User';
import { StockExitRepository, CreateStockExitData } from '../repositories/StockExitRepository';
import { ExpirationNotificationRepository } from '../repositories/ExpirationNotificationRepository';
import { StockExitType } from '../types/enums';
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
  private stockExitRepository: StockExitRepository;
  private expirationNotificationRepository: ExpirationNotificationRepository;

  constructor(stockExitRepository?: StockExitRepository) {
    this.stockExitRepository = stockExitRepository ?? new StockExitRepository();
    this.expirationNotificationRepository = new ExpirationNotificationRepository();
  }

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
    userId: string,
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
          include: [{ model: StorageArea, as: 'storageArea' }],
          transaction,
          // Lock the stored item only. A bare FOR UPDATE covers every table in
          // the FROM list, and Postgres rejects locking the nullable side of
          // the LEFT JOIN on storage_areas ("FOR UPDATE cannot be applied to
          // the nullable side of an outer join"). The storage area is read for
          // the exit snapshot and never mutated here, so it needs no lock.
          lock: { level: transaction.LOCK.UPDATE, of: StoredItem },
        });

        if (!storedItem) {
          throw new NotFoundError(
            `Stored item ${deduction.storedItemId} not found`
          );
        }

        const item = await Item.findByPk(storedItem.itemId, { transaction });
        const itemName = item?.name ?? '';

        // Snapshot the stored item BEFORE any mutation so the exit log can
        // recreate it exactly (undo) and stats reflect the pre-deduction state.
        const restoreSnapshot = this.buildRestoreSnapshot(storedItem);
        const exitSnapshots = {
          itemNameSnapshot: item?.name ?? null,
          categorySnapshot: item?.category ?? null,
          storageAreaIdSnapshot: storedItem.storageAreaId ?? null,
          storageAreaNameSnapshot: storedItem.storageArea?.name ?? null,
          expirationDateSnapshot: storedItem.expirationDate
            ? new Date(storedItem.expirationDate)
            : null,
          restoreSnapshot,
        };

        const deductionNormalized = normalizeToBaseUnit(
          deduction.quantity,
          deduction.unit
        );
        const storedNormalized = normalizeToBaseUnit(
          Number(storedItem.quantity),
          storedItem.unit
        );

        // Pre-deduction quantity in the stored item's own unit — the exit log
        // always records the amount removed from THIS stored item in ITS unit.
        const preQuantity = Number(storedItem.quantity);

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
            await this.logConsumedExit(storedItem, preQuantity, householdId, userId, exitSnapshots, transaction);
            await this.expirationNotificationRepository.deleteByStoredItemId(storedItem.id, { transaction });
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
            await this.logConsumedExit(storedItem, preQuantity - remaining, householdId, userId, exitSnapshots, transaction);
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
            await this.logConsumedExit(storedItem, preQuantity, householdId, userId, exitSnapshots, transaction);
            await this.expirationNotificationRepository.deleteByStoredItemId(storedItem.id, { transaction });
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
            await this.logConsumedExit(storedItem, preQuantity - newQuantity, householdId, userId, exitSnapshots, transaction);
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

  /**
   * Log a `consumed` stock exit for a stored item deduction, inside the given
   * transaction so it rolls back atomically with the deduction.
   */
  private async logConsumedExit(
    storedItem: StoredItem,
    quantityDeducted: number,
    householdId: string,
    userId: string,
    snapshots: {
      itemNameSnapshot: string | null;
      categorySnapshot: string | null;
      storageAreaIdSnapshot: string | null;
      storageAreaNameSnapshot: string | null;
      expirationDateSnapshot: Date | null;
      restoreSnapshot: Record<string, unknown>;
    },
    transaction: Transaction
  ): Promise<void> {
    // Guard against rounding producing a non-positive quantity (model min 0.001).
    if (!Number.isFinite(quantityDeducted) || quantityDeducted < 0.001) {
      return;
    }

    const createData: CreateStockExitData = {
      householdId,
      storedItemId: storedItem.id,
      itemId: storedItem.itemId,
      exitType: StockExitType.CONSUMED,
      quantity: quantityDeducted,
      unit: storedItem.unit,
      exitedBy: userId,
      itemNameSnapshot: snapshots.itemNameSnapshot,
      categorySnapshot: snapshots.categorySnapshot,
      storageAreaIdSnapshot: snapshots.storageAreaIdSnapshot,
      storageAreaNameSnapshot: snapshots.storageAreaNameSnapshot,
      expirationDateSnapshot: snapshots.expirationDateSnapshot,
      restoreSnapshot: snapshots.restoreSnapshot,
    };

    await this.stockExitRepository.create(createData, { transaction });
  }

  private buildRestoreSnapshot(storedItem: StoredItem): Record<string, unknown> {
    return {
      id: storedItem.id,
      itemId: storedItem.itemId,
      storageAreaId: storedItem.storageAreaId,
      quantity: Number(storedItem.quantity),
      unit: storedItem.unit,
      expirationDate: storedItem.expirationDate
        ? new Date(storedItem.expirationDate).toISOString().split('T')[0]
        : null,
      location: storedItem.location,
      isOpened: storedItem.isOpened,
      openedDate: storedItem.openedDate ? new Date(storedItem.openedDate).toISOString().split('T')[0] : null,
      frozenDate: storedItem.frozenDate ? new Date(storedItem.frozenDate).toISOString().split('T')[0] : null,
      cookedDate: storedItem.cookedDate ? new Date(storedItem.cookedDate).toISOString().split('T')[0] : null,
      householdId: storedItem.householdId,
      createdBy: storedItem.createdBy,
    };
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
