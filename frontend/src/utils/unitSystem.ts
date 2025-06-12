
export interface UnitCategory {
  name: string;
  defaultUnit: string;
  availableUnits: string[];
}

export const UNIT_CATEGORIES: Record<string, UnitCategory> = {
  'Dairy': {
    name: 'Dairy',
    defaultUnit: 'gallon',
    availableUnits: ['gallon', 'half gallon', 'quart', 'pint', 'cup', 'fl oz']
  },
  'Produce': {
    name: 'Produce',
    defaultUnit: 'lb',
    availableUnits: ['lb', 'oz', 'kg', 'g', 'piece', 'bunch', 'bag']
  },
  'Meat': {
    name: 'Meat',
    defaultUnit: 'lb',
    availableUnits: ['lb', 'oz', 'kg', 'g', 'piece', 'package']
  },
  'Bakery': {
    name: 'Bakery',
    defaultUnit: 'loaf',
    availableUnits: ['loaf', 'piece', 'dozen', 'package', 'bag']
  },
  'Grains': {
    name: 'Grains',
    defaultUnit: 'lb',
    availableUnits: ['lb', 'oz', 'kg', 'g', 'cup', 'bag', 'box']
  },
  'Beverages': {
    name: 'Beverages',
    defaultUnit: 'bottle',
    availableUnits: ['bottle', 'can', 'gallon', 'liter', 'ml', 'cup', 'pack']
  },
  'Canned': {
    name: 'Canned',
    defaultUnit: 'can',
    availableUnits: ['can', 'jar', 'bottle', 'package', 'box']
  },
  'Frozen': {
    name: 'Frozen',
    defaultUnit: 'package',
    availableUnits: ['package', 'bag', 'box', 'lb', 'oz']
  },
  'Snacks': {
    name: 'Snacks',
    defaultUnit: 'bag',
    availableUnits: ['bag', 'box', 'package', 'piece', 'oz']
  },
  'Condiments': {
    name: 'Condiments',
    defaultUnit: 'bottle',
    availableUnits: ['bottle', 'jar', 'packet', 'tube', 'can']
  },
  'Other': {
    name: 'Other',
    defaultUnit: 'piece',
    availableUnits: ['piece', 'package', 'box', 'bag', 'bottle']
  }
};

export const getUnitsForCategory = (category: string): UnitCategory => {
  return UNIT_CATEGORIES[category] || UNIT_CATEGORIES['Other'];
};

export const getAllCategories = (): string[] => {
  return Object.keys(UNIT_CATEGORIES);
};
