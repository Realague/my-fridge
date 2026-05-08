export enum StorageAreaType {
  FRIDGE = 'fridge',
  FREEZER = 'freezer',
  PANTRY = 'pantry',
  KITCHEN_CUPBOARD = 'kitchen_cupboard',
  OTHER = 'other'
}

// Helper to get all enum values as an array
export const STORAGE_AREA_TYPES = Object.values(StorageAreaType);

export enum ItemCategory {
  VEGETABLES = 'vegetables',
  FRUITS = 'fruits',
  MEAT = 'meat',
  FISH = 'fish',
  SEAFOOD = 'seafood',
  DAIRY = 'dairy',
  GRAINS = 'grains',
  SPICES = 'spices',
  BEVERAGES = 'beverages',
  SNACKS = 'snacks',
  CONDIMENTS = 'condiments',
  FROZEN = 'frozen',
  CANNED = 'canned',
  MEAL = 'meal',
  PREPARATION = 'preparation',
  CLEANING_PRODUCTS = 'cleaning_products',
  OTHER = 'other'
}

export const ITEM_CATEGORIES = Object.values(ItemCategory);

export enum Unit {
  // Weight
  GRAM = 'g',
  KILOGRAM = 'kg',

  // Volume
  MILLILITER = 'ml',
  CENTILITER = 'cl',
  LITER = 'l',
  TABLESPOON = 'tbsp',
  TEASPOON = 'tsp',

  // Pieces
  PIECE = 'piece',

  // Portion / cooked dish — only valid on catalog `items` in category `meal`.
  SERVING = 'serving',

  // Free-quantity (gestural) units — recipe-only, no numeric quantity
  PINCH = 'pinch',
  DRIZZLE = 'drizzle',
  KNOB = 'knob',
}

export const UNITS = Object.values(Unit);

// Free-quantity units (gestural, recipe-only, no numeric value)
export const FREE_QUANTITY_UNITS: Unit[] = [
  Unit.PINCH,
  Unit.DRIZZLE,
  Unit.KNOB,
];

// No globally hidden base units. `serving` is not in catalog storage (see
// isCatalogStorageUnitForCategory) except for `ItemCategory.MEAL`.
export const HIDDEN_STORAGE_UNITS: Unit[] = [];

// Base units for catalog `items` (defaultUnit / availableUnits) — no `serving`
// (use isCatalogStorageUnitForCategory; meal may add serving).
export const CATALOG_BASE_STORAGE_UNITS: Unit[] = [
  Unit.GRAM,
  Unit.KILOGRAM,
  Unit.MILLILITER,
  Unit.CENTILITER,
  Unit.LITER,
  Unit.PIECE,
];

// Alias kept for seed scripts & clarity.
export const STORAGE_UNITS: Unit[] = CATALOG_BASE_STORAGE_UNITS;

/** `serving` is allowed on inventory/shopping lines (e.g. legacy or meal-prepared). */
export const LINE_STORAGE_UNITS: Unit[] = [...CATALOG_BASE_STORAGE_UNITS, Unit.SERVING];

export function isCatalogStorageUnitForCategory(unit: Unit, category: ItemCategory | string): boolean {
  if (CATALOG_BASE_STORAGE_UNITS.includes(unit)) return true;
  return unit === Unit.SERVING && category === ItemCategory.MEAL;
}

// Recipe units — everything a recipe ingredient can use.
export const RECIPE_UNITS = [
  ...LINE_STORAGE_UNITS,
  Unit.TABLESPOON,
  Unit.TEASPOON,
  ...FREE_QUANTITY_UNITS,
];

export enum ShoppingItemStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum BarcodeFormat {
  EAN13 = 'ean13',
  EAN8 = 'ean8',
  CODE128 = 'code128',
  CODE39 = 'code39',
  QR = 'qr',
  DATA_MATRIX = 'data_matrix',
  PDF417 = 'pdf417',
  AZTEC = 'aztec',
  OTHER = 'other'
}

export const BARCODE_FORMATS = Object.values(BarcodeFormat);