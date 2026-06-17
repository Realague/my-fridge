import { StorageAreaType } from '@/types/enums';

/**
 * Default expiration window (in days) for a cooked meal, by storage area type.
 * Mirrors backend/src/utils/cookedMealDefaults.ts.
 *
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
  storageAreaType: StorageAreaType | string | undefined,
  cookedDate: Date | string | undefined,
): Date | null {
  if (!storageAreaType || !cookedDate) return null;
  const days = COOKED_MEAL_DEFAULT_EXPIRATION_DAYS[storageAreaType as StorageAreaType];
  if (days === null || days === undefined) return null;
  const base = typeof cookedDate === 'string' ? new Date(cookedDate) : new Date(cookedDate.getTime());
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() + days);
  return base;
}

/** Returns the expiration date as `YYYY-MM-DD` or null. */
export function computeCookedMealExpirationISO(
  storageAreaType: StorageAreaType | string | undefined,
  cookedDate: Date | string | undefined,
): string | null {
  const d = computeCookedMealExpiration(storageAreaType, cookedDate);
  return d ? d.toISOString().split('T')[0] : null;
}
