import { Item } from '../services/itemService';

/**
 * Get the display name for an item, using translation for seeded items
 * and the original name for user-created items
 */
export const getItemDisplayName = (item: Item | undefined, t: (key: string, options?: any) => string): string => {
  if (!item) {
    return '';
  }

  // If it's a user-created item (has householdId), return the original name
  if (item?.householdId) {
    return item.name;
  }
  
  // If it's a seeded item (householdId is null), use the name as translation key
  return t(`items.${item.name}`);
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
