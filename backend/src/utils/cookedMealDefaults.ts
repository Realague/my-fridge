import { StorageAreaType } from '../types/enums';

/**
 * Default expiration window (in days) for a cooked meal, by storage area type.
 * - Fridge: 3 days from cooking date.
 * - Freezer: 60 days (~2 months) from cooking date.
 * - Pantry / kitchen cupboard / other: no default — user must enter manually.
 */
export const COOKED_MEAL_DEFAULT_EXPIRATION_DAYS: Record<StorageAreaType, number | null> = {
  [StorageAreaType.FRIDGE]: 3,
  [StorageAreaType.FREEZER]: 60,
  [StorageAreaType.PANTRY]: null,
  [StorageAreaType.KITCHEN_CUPBOARD]: null,
  [StorageAreaType.OTHER]: null,
};

/**
 * Compute the default expiration date for a cooked meal placed in a given
 * storage area type. Returns null when no default applies (user input expected).
 */
export function computeCookedMealExpiration(
  storageAreaType: StorageAreaType,
  cookedDate: Date | string,
): Date | null {
  const days = COOKED_MEAL_DEFAULT_EXPIRATION_DAYS[storageAreaType];
  if (days === null || days === undefined) return null;
  const base = typeof cookedDate === 'string' ? new Date(cookedDate) : new Date(cookedDate.getTime());
  base.setDate(base.getDate() + days);
  return base;
}
