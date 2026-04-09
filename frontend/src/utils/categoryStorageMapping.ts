import { StorageAreaType } from '@/types/enums';

interface StorageAreaLike {
  id: string;
  type: StorageAreaType;
  defaultCategories?: string[];
}

const CATEGORY_TO_STORAGE_TYPE: Record<string, StorageAreaType> = {
  vegetables: StorageAreaType.FRIDGE,
  fruits: StorageAreaType.FRIDGE,
  meat: StorageAreaType.FRIDGE,
  dairy: StorageAreaType.FRIDGE,
  grains: StorageAreaType.PANTRY,
  spices: StorageAreaType.KITCHEN_CUPBOARD,
  beverages: StorageAreaType.PANTRY,
  snacks: StorageAreaType.PANTRY,
  condiments: StorageAreaType.FRIDGE,
  frozen: StorageAreaType.FREEZER,
  canned: StorageAreaType.PANTRY,
  meal: StorageAreaType.FRIDGE,
  preparation: StorageAreaType.FRIDGE,
  cleaning_products: StorageAreaType.OTHER,
  other: StorageAreaType.PANTRY,
};

export function getSuggestedStorageType(category: string): StorageAreaType {
  return CATEGORY_TO_STORAGE_TYPE[category] ?? StorageAreaType.PANTRY;
}

export function getSuggestedStorageAreaId(
  category: string | undefined,
  storageAreas: StorageAreaLike[]
): string | undefined {
  if (!category || storageAreas.length === 0) return storageAreas[0]?.id;

  // Priority 1: find a storage area that explicitly lists this category in its defaults
  const explicitMatch = storageAreas.find(
    a => a.defaultCategories && a.defaultCategories.includes(category)
  );
  if (explicitMatch) return explicitMatch.id;

  // Priority 2: fallback to hardcoded category -> storage type mapping
  const suggestedType = CATEGORY_TO_STORAGE_TYPE[category];
  const typeMatch = storageAreas.find(a => a.type === suggestedType);
  if (typeMatch) return typeMatch.id;

  return storageAreas[0]?.id;
}
