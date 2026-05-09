import { Item } from '../services/itemService';

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

/**
 * Get the color classes for a category
 */
export const getCategoryColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    'vegetables': 'bg-green-100 text-green-800',
    'fruits': 'bg-orange-100 text-orange-800',
    'meat': 'bg-red-100 text-red-800',
    'fish': 'bg-sky-100 text-sky-800',
    'seafood': 'bg-teal-100 text-teal-800',
    'dairy': 'bg-blue-100 text-blue-800',
    'grains': 'bg-yellow-100 text-yellow-800',
    'spices': 'bg-purple-100 text-purple-800',
    'beverages': 'bg-cyan-100 text-cyan-800',
    'snacks': 'bg-pink-100 text-pink-800',
    'condiments': 'bg-indigo-100 text-indigo-800',
    'frozen': 'bg-blue-200 text-blue-900',
    'canned': 'bg-gray-100 text-gray-800',
    'meal': 'bg-amber-100 text-amber-800',
    'cooked_meal': 'bg-lime-100 text-lime-800',
    'preparation': 'bg-rose-100 text-rose-800',
    'cleaning_products': 'bg-teal-100 text-teal-800',
    'bakery': 'bg-orange-200 text-orange-900',
    'household': 'bg-teal-100 text-teal-800',
    'personal': 'bg-pink-200 text-pink-900',
    'other': 'bg-gray-100 text-gray-700'
  };
  return colors[category?.toLowerCase()] || colors['other'];
};