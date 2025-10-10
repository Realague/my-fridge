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

/**
 * Get the color classes for a category
 */
export const getCategoryColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    'vegetables': 'bg-green-100 text-green-800',
    'fruits': 'bg-orange-100 text-orange-800',
    'meat': 'bg-red-100 text-red-800',
    'dairy': 'bg-blue-100 text-blue-800',
    'grains': 'bg-yellow-100 text-yellow-800',
    'spices': 'bg-purple-100 text-purple-800',
    'beverages': 'bg-cyan-100 text-cyan-800',
    'snacks': 'bg-pink-100 text-pink-800',
    'condiments': 'bg-indigo-100 text-indigo-800',
    'frozen': 'bg-blue-200 text-blue-900',
    'canned': 'bg-gray-100 text-gray-800',
    'bakery': 'bg-orange-200 text-orange-900',
    'household': 'bg-teal-100 text-teal-800',
    'personal': 'bg-pink-200 text-pink-900',
    'other': 'bg-gray-100 text-gray-700'
  };
  return colors[category?.toLowerCase()] || colors['other'];
};