import { ItemCategory } from '../types/enums';

/**
 * Get recommended freezer storage days based on item category
 * Based on USDA food safety guidelines for optimal quality
 * @param category Item category
 * @returns Recommended storage days in freezer
 */
export function getRecommendedFreezerDays(category: ItemCategory): number {
  // Convert months to days (using average month length of 30 days)
  const recommendations: Record<ItemCategory, number> = {
    [ItemCategory.MEAT]: 120, // 3-4 months, using 4 months (120 days)
    [ItemCategory.FISH]: 90, // 2-3 months, using 3 months (90 days)
    [ItemCategory.SEAFOOD]: 90, // 2-3 months, using 3 months (90 days)
    [ItemCategory.DAIRY]: 90, // 1-3 months, using 3 months (90 days)
    [ItemCategory.VEGETABLES]: 300, // 8-12 months, using 10 months (300 days)
    [ItemCategory.FRUITS]: 300, // 8-12 months, using 10 months (300 days)
    [ItemCategory.FROZEN]: 180, // Pre-frozen items, 6 months (180 days)
    [ItemCategory.MEAL]: 90, // Prepared meals, 2-3 months, using 3 months (90 days)
    [ItemCategory.PREPARATION]: 90, // Preparations, 2-3 months, using 3 months (90 days)
    [ItemCategory.GRAINS]: 180, // Grains, 6 months (180 days)
    [ItemCategory.SNACKS]: 180, // Snacks, 6 months (180 days)
    [ItemCategory.CONDIMENTS]: 180, // Condiments, 6 months (180 days)
    [ItemCategory.CANNED]: 180, // Canned items, 6 months (180 days)
    [ItemCategory.BEVERAGES]: 180, // Beverages, 6 months (180 days)
    [ItemCategory.SPICES]: 180, // Spices, 6 months (180 days)
    [ItemCategory.CLEANING_PRODUCTS]: 180, // Cleaning products, 6 months (180 days)
    [ItemCategory.OTHER]: 180, // Default: 6 months (180 days)
  };

  return recommendations[category] || 180; // Default to 6 months if category not found
}

