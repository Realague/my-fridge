import { Unit, ItemCategory, ITEM_CATEGORIES, UNITS } from '@/types/enums';

export interface UnitCategory {
  name: string;
  defaultUnit: string;
  availableUnits: string[];
}

export const UNIT_CATEGORIES: Record<string, UnitCategory> = {
  [ItemCategory.DAIRY]: {
    name: 'Dairy',
    defaultUnit: Unit.GALLON,
    availableUnits: [Unit.GALLON, Unit.CUP, Unit.FLUID_OUNCE, Unit.LITER, Unit.MILLILITER]
  },
  [ItemCategory.VEGETABLES]: {
    name: 'Vegetables',
    defaultUnit: Unit.POUND,
    availableUnits: [Unit.POUND, Unit.OUNCE, Unit.KILOGRAM, Unit.GRAM, Unit.PIECE, Unit.BUNCH, Unit.PACK]
  },
  [ItemCategory.FRUITS]: {
    name: 'Fruits',
    defaultUnit: Unit.POUND,
    availableUnits: [Unit.POUND, Unit.OUNCE, Unit.KILOGRAM, Unit.GRAM, Unit.PIECE, Unit.BUNCH, Unit.PACK]
  },
  [ItemCategory.MEAT]: {
    name: 'Meat',
    defaultUnit: Unit.POUND,
    availableUnits: [Unit.POUND, Unit.OUNCE, Unit.KILOGRAM, Unit.GRAM, Unit.PIECE, Unit.PACK]
  },
  [ItemCategory.GRAINS]: {
    name: 'Grains',
    defaultUnit: Unit.POUND,
    availableUnits: [Unit.POUND, Unit.OUNCE, Unit.KILOGRAM, Unit.GRAM, Unit.CUP, Unit.PACK]
  },
  [ItemCategory.BEVERAGES]: {
    name: 'Beverages',
    defaultUnit: Unit.LITER,
    availableUnits: [Unit.LITER, Unit.MILLILITER, Unit.GALLON, Unit.CUP, Unit.FLUID_OUNCE, Unit.PACK]
  },
  [ItemCategory.CANNED]: {
    name: 'Canned',
    defaultUnit: Unit.PACK,
    availableUnits: [Unit.PACK, Unit.PIECE, Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND]
  },
  [ItemCategory.FROZEN]: {
    name: 'Frozen',
    defaultUnit: Unit.PACK,
    availableUnits: [Unit.PACK, Unit.POUND, Unit.OUNCE, Unit.KILOGRAM, Unit.GRAM, Unit.PIECE]
  },
  [ItemCategory.SNACKS]: {
    name: 'Snacks',
    defaultUnit: Unit.PACK,
    availableUnits: [Unit.PACK, Unit.PIECE, Unit.OUNCE, Unit.GRAM]
  },
  [ItemCategory.CONDIMENTS]: {
    name: 'Condiments',
    defaultUnit: Unit.PACK,
    availableUnits: [Unit.PACK, Unit.PIECE, Unit.FLUID_OUNCE, Unit.MILLILITER, Unit.TABLESPOON, Unit.TEASPOON]
  },
  [ItemCategory.SPICES]: {
    name: 'Spices',
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON, Unit.PACK]
  },
  [ItemCategory.OTHER]: {
    name: 'Other',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.PACK, Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND]
  }
};

export const getUnitsForCategory = (category: string): UnitCategory => {
  return UNIT_CATEGORIES[category] || UNIT_CATEGORIES[ItemCategory.OTHER];
};

export const getAllCategories = (): string[] => {
  return Object.keys(UNIT_CATEGORIES);
};

// Helper function to get display name for units
export const getUnitDisplayName = (unit: string): string => {
  const displayNames: Record<string, string> = {
    [Unit.GRAM]: 'g',
    [Unit.KILOGRAM]: 'kg',
    [Unit.POUND]: 'lb',
    [Unit.OUNCE]: 'oz',
    [Unit.MILLILITER]: 'ml',
    [Unit.LITER]: 'l',
    [Unit.CUP]: 'cup',
    [Unit.TABLESPOON]: 'tbsp',
    [Unit.TEASPOON]: 'tsp',
    [Unit.FLUID_OUNCE]: 'floz',
    [Unit.GALLON]: 'gal',
    [Unit.PIECE]: 'piece',
    [Unit.PACK]: 'pack',
    [Unit.BUNCH]: 'bunch',
    [Unit.DOZEN]: 'dozen',
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
