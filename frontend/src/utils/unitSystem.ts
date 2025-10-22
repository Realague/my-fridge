import { Unit, ItemCategory, ITEM_CATEGORIES, UNITS } from '@/types/enums';

export interface UnitCategory {
  name: string;
  defaultUnit: string;
  availableUnits: string[];
}

// Storage units (excluding cooking measurements)
export const STORAGE_UNITS = [
  Unit.GRAM,
  Unit.KILOGRAM,
  Unit.MILLILITER,
  Unit.LITER,
  Unit.PIECE,
  Unit.PACK,
  Unit.BUNCH,
  Unit.DOZEN,
  Unit.SERVING,
];

// Recipe units (includes all units including cooking measurements)
export const RECIPE_UNITS = [
  ...STORAGE_UNITS,
  Unit.CUP,
  Unit.TABLESPOON,
  Unit.TEASPOON,
];

export const UNIT_CATEGORIES: Record<string, UnitCategory> = {
  [ItemCategory.DAIRY]: {
    name: 'Dairy',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.PIECE, Unit.LITER, Unit.MILLILITER, Unit.PACK]
  },
  [ItemCategory.VEGETABLES]: {
    name: 'Vegetables',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE, Unit.PACK]
  },
  [ItemCategory.FRUITS]: {
    name: 'Fruits',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE, Unit.BUNCH, Unit.PACK]
  },
  [ItemCategory.MEAT]: {
    name: 'Meat',
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE, Unit.PACK]
  },
  [ItemCategory.GRAINS]: {
    name: 'Grains',
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PACK]
  },
  [ItemCategory.BEVERAGES]: {
    name: 'Beverages',
    defaultUnit: Unit.LITER,
    availableUnits: [Unit.LITER, Unit.MILLILITER, Unit.PACK]
  },
  [ItemCategory.CANNED]: {
    name: 'Canned',
    defaultUnit: Unit.PACK,
    availableUnits: [Unit.PACK, Unit.PIECE, Unit.GRAM, Unit.KILOGRAM]
  },
  [ItemCategory.FROZEN]: {
    name: 'Frozen',
    defaultUnit: Unit.PACK,
    availableUnits: [Unit.PACK, Unit.KILOGRAM, Unit.GRAM, Unit.PIECE]
  },
  [ItemCategory.SNACKS]: {
    name: 'Snacks',
    defaultUnit: Unit.PACK,
    availableUnits: [Unit.PACK, Unit.PIECE, Unit.GRAM]
  },
  [ItemCategory.CONDIMENTS]: {
    name: 'Condiments',
    defaultUnit: Unit.PACK,
    availableUnits: [Unit.PACK, Unit.PIECE, Unit.MILLILITER]
  },
  [ItemCategory.SPICES]: {
    name: 'Spices',
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.PACK]
  },
  [ItemCategory.MEAL]: {
    name: 'Meal',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.SERVING]
  },
  [ItemCategory.PREPARATION]: {
    name: 'Preparation',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE]
  },
  [ItemCategory.CLEANING_PRODUCTS]: {
    name: 'Cleaning Products',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PACK, Unit.PIECE, Unit.LITER, Unit.MILLILITER]
  },
  [ItemCategory.OTHER]: {
    name: 'Other',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.PACK, Unit.GRAM, Unit.KILOGRAM]
  }
};

// Get units for a category with optional context (storage vs recipe)
export const getUnitsForCategory = (category: string, context: 'storage' | 'recipe' = 'storage'): UnitCategory => {
  const categoryUnits = UNIT_CATEGORIES[category] || UNIT_CATEGORIES[ItemCategory.OTHER];
  
  // For storage context, filter out cooking measurements
  if (context === 'storage') {
    return {
      ...categoryUnits,
      availableUnits: categoryUnits.availableUnits.filter(unit => STORAGE_UNITS.includes(unit as Unit))
    };
  }
  
  // For recipe context, include all units
  return categoryUnits;
};

export const getAllCategories = (): string[] => {
  return Object.keys(UNIT_CATEGORIES);
};

// Helper function to get display name for units
export const getUnitDisplayName = (unit: string): string => {
  const displayNames: Record<string, string> = {
    [Unit.GRAM]: 'g',
    [Unit.KILOGRAM]: 'kg',
    [Unit.MILLILITER]: 'ml',
    [Unit.LITER]: 'l',
    [Unit.CUP]: 'cup',
    [Unit.TABLESPOON]: 'tbsp',
    [Unit.TEASPOON]: 'tsp',
    [Unit.PIECE]: 'piece',
    [Unit.PACK]: 'pack',
    [Unit.BUNCH]: 'bunch',
    [Unit.DOZEN]: 'dozen',
    [Unit.SERVING]: 'serving',
    [Unit.OTHER]: 'other'
  };
  
  return displayNames[unit] || unit;
};

// Validation functions
export const isValidUnit = (unit: string): boolean => {
  return UNITS.includes(unit as Unit);
};

export const isValidCategory = (category: string): boolean => {
  return ITEM_CATEGORIES.includes(category as ItemCategory);
};

// Helper to ensure a unit is valid, fallback to PIECE
export const sanitizeUnit = (unit: string): string => {
  return isValidUnit(unit) ? unit : Unit.PIECE;
};

// Helper to ensure a category is valid, fallback to OTHER
export const sanitizeCategory = (category: string): string => {
  return isValidCategory(category) ? category : ItemCategory.OTHER;
};
