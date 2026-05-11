import { Item } from '../services/itemService';
import { categoryTone, toneBadgeClass } from '../lib/tokenMaps';

/**
 * Get the display name for an item.
 *
 * Rules:
 * - User-created / household items (householdId not null) → return original name
 * - Seeded/global items (householdId === null) → try i18n key `items.<name>`
 *   and fall back to the raw name if no translation exists
 * - Items without a defined householdId (undefined) are treated as custom and
 *   **not** forced through the translation layer (fallback to raw name).
 */
export const getItemDisplayName = (
  item: Item | undefined,
  t: (key: string, options?: any) => string
): string => {
  if (!item) return '';

  const householdId = (item as any).householdId;

  // User-created / household-specific items: always use the stored name
  if (householdId !== null && householdId !== undefined) {
    return item.name;
  }

  // Seeded/global items: try translation first
  const translationKey = `items.${item.name}`;
  const translated = t(translationKey);

  // If no translation is found (i18n returns the key itself), fall back to the raw name
  if (!translated || translated === translationKey) {
    return item.name;
  }

  return translated;
};

/**
 * Check if an item is a seeded item (global item)
 */
export const isSeededItem = (item: Item): boolean => {
  return item.householdId === null;
};

/**
 * Check if an item is user-created (household-specific item)
 */
export const isUserCreatedItem = (item: Item): boolean => {
  return item.householdId !== null;
};

// Charter-mapped category badge classes. Resolves each of the 21 categories
// onto one of the 4 charter semantic tones via lib/tokenMaps.
export const getCategoryColor = (category: string): string => {
  return toneBadgeClass(categoryTone(category));
};