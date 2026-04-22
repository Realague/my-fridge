import { Unit, ItemCategory, ITEM_CATEGORIES, UNITS, FREE_QUANTITY_UNITS, HIDDEN_STORAGE_UNITS } from '@/types/enums';

export interface UnitCategory {
  name: string;
  defaultUnit: string;
  availableUnits: string[];
}

// Base storage units (catalog + inventory lines) — excludes `serving`.
// `serving` is only valid for `ItemCategory.MEAL` on catalog items (see getStorableUnitOptionsForItemCategory).
export const STORAGE_UNITS = [
  Unit.GRAM,
  Unit.KILOGRAM,
  Unit.MILLILITER,
  Unit.CENTILITER,
  Unit.LITER,
  Unit.PIECE,
];

/** All units that may appear on a stored/shopping row (includes legacy `serving`). */
export const LINE_STORAGE_UNITS = [...STORAGE_UNITS, Unit.SERVING];

// Units actually exposed in the default storage selector (no hidden legacy units).
export const VISIBLE_STORAGE_UNITS = STORAGE_UNITS.filter(
  unit => !HIDDEN_STORAGE_UNITS.includes(unit as Unit)
);

/** Pool of units the user can add in the item editor for a given catalog category. */
export const getStorableUnitOptionsForItemCategory = (category: string): Unit[] =>
  category === ItemCategory.MEAL ? [...STORAGE_UNITS, Unit.SERVING] : [...STORAGE_UNITS];

// Recipe units (includes cooking measurements and free-quantity gestural units).
export const RECIPE_UNITS = [
  ...LINE_STORAGE_UNITS,
  Unit.TABLESPOON,
  Unit.TEASPOON,
  ...FREE_QUANTITY_UNITS,
];

export const UNIT_CATEGORIES: Record<string, UnitCategory> = {
  [ItemCategory.DAIRY]: {
    name: 'Dairy',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.PIECE, Unit.LITER, Unit.CENTILITER, Unit.MILLILITER]
  },
  [ItemCategory.VEGETABLES]: {
    name: 'Vegetables',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE]
  },
  [ItemCategory.FRUITS]: {
    name: 'Fruits',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE]
  },
  [ItemCategory.MEAT]: {
    name: 'Meat',
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE]
  },
  [ItemCategory.FISH]: {
    name: 'Fish',
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE]
  },
  [ItemCategory.SEAFOOD]: {
    name: 'Seafood',
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE]
  },
  [ItemCategory.GRAINS]: {
    name: 'Grains',
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE]
  },
  [ItemCategory.BEVERAGES]: {
    name: 'Beverages',
    defaultUnit: Unit.LITER,
    availableUnits: [Unit.LITER, Unit.CENTILITER, Unit.MILLILITER, Unit.PIECE]
  },
  [ItemCategory.CANNED]: {
    name: 'Canned',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM]
  },
  [ItemCategory.FROZEN]: {
    name: 'Frozen',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM]
  },
  [ItemCategory.SNACKS]: {
    name: 'Snacks',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM]
  },
  [ItemCategory.CONDIMENTS]: {
    name: 'Condiments',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.CENTILITER, Unit.MILLILITER]
  },
  [ItemCategory.SPICES]: {
    name: 'Spices',
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.PIECE]
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
    availableUnits: [Unit.PIECE, Unit.LITER, Unit.CENTILITER, Unit.MILLILITER]
  },
  [ItemCategory.OTHER]: {
    name: 'Other',
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM]
  }
};

// Get units for a category with optional context (storage vs recipe).
// Storage: excludes cooking measurements, free-quantity gestural units, and hidden legacy units.
// Recipe: adds cooking measurements (tbsp, tsp) and free-quantity units (pinch, drizzle, knob).
export const getUnitsForCategory = (category: string, context: 'storage' | 'recipe' = 'storage'): UnitCategory => {
  const categoryUnits = UNIT_CATEGORIES[category] || UNIT_CATEGORIES[ItemCategory.OTHER];

  const allowedStorage = new Set<Unit>([
    ...VISIBLE_STORAGE_UNITS,
    ...(category === ItemCategory.MEAL ? [Unit.SERVING] : []),
  ]);

  if (context === 'storage') {
    return {
      ...categoryUnits,
      availableUnits: categoryUnits.availableUnits.filter(unit =>
        allowedStorage.has(unit as Unit)
      ),
    };
  }

  const cookingUnits = [Unit.TABLESPOON, Unit.TEASPOON];
  return {
    ...categoryUnits,
    availableUnits: [
      ...categoryUnits.availableUnits.filter(unit =>
        allowedStorage.has(unit as Unit)
      ),
      ...cookingUnits,
      ...FREE_QUANTITY_UNITS,
    ],
  };
};

export const getAllCategories = (): string[] => {
  return Object.keys(UNIT_CATEGORIES);
};

// Helper function to get display name for units (maps enum value to i18n key suffix).
export const getUnitDisplayName = (unit: string): string => {
  const displayNames: Record<string, string> = {
    [Unit.GRAM]: 'g',
    [Unit.KILOGRAM]: 'kg',
    [Unit.MILLILITER]: 'ml',
    [Unit.CENTILITER]: 'cl',
    [Unit.LITER]: 'l',
    [Unit.TABLESPOON]: 'tbsp',
    [Unit.TEASPOON]: 'tsp',
    [Unit.PIECE]: 'piece',
    [Unit.SERVING]: 'serving',
    [Unit.PINCH]: 'pinch',
    [Unit.DRIZZLE]: 'drizzle',
    [Unit.KNOB]: 'knob',
  };

  return displayNames[unit] || unit;
};

export const isFreeQuantityUnit = (unit: string | null | undefined): boolean => {
  if (!unit) return false;
  return FREE_QUANTITY_UNITS.includes(unit as Unit);
};

/** Localized unit with singular/plural for units that have both keys (piece/pieces). */
export const getTranslatedUnitLabel = (
  unit: string,
  quantity: number | string,
  t: (key: string) => string
): string => {
  const key = getUnitDisplayName(unit);
  const q = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  const singular = Number.isFinite(q) && Math.abs(q - 1) < 1e-9;
  if (key === 'piece') {
    return t(singular ? 'units.piece' : 'units.pieces');
  }
  return t(`units.${key}`);
};

export interface DisplayUnitOptions {
  /** Catalog item providing pieceAlias and/or pluralized name. */
  item?: {
    name?: string;
    pieceAlias?: string | null;
  } | null;
  /** Overrides the translated item name used for pluralization fallback. */
  itemName?: string | null;
  /** Whether the ingredient is a free-quantity ("à l'œil") recipe ingredient. */
  isFreeQuantity?: boolean;
}

/**
 * Returns the unit label to display next to a quantity.
 *
 * Display rules (in priority order):
 *   1. Free-quantity units (pinch/drizzle/knob) render as "pincée de", "filet de", "noix de"
 *      via the shared `units.freeQuantity.*` i18n keys. They never pluralize and do not show
 *      a numeric value.
 *   2. PIECE units use `item.pieceAlias` when set ("gousse d'ail", "tranche de jambon").
 *   3. PIECE units without an alias fall back to the pluralized item name when provided, so we
 *      show "3 oeufs" instead of "3 pièces oeufs".
 *   4. Everything else goes through `getTranslatedUnitLabel` for normal singular/plural handling.
 *
 * The returned string includes the unit descriptor only (no quantity, no item name).
 * For free quantities the caller should also append the item name since the label ends with "de".
 */
export const getDisplayUnitLabel = (
  unit: string,
  quantity: number | string | null | undefined,
  t: (key: string) => string,
  options: DisplayUnitOptions = {}
): string => {
  const { item, itemName, isFreeQuantity } = options;

  if (isFreeQuantity || isFreeQuantityUnit(unit)) {
    const key = getUnitDisplayName(unit);
    // Free-quantity keys are grouped under `units.freeQuantity.*` so apps can localize
    // the linking preposition ("pincée de", "filet de"…) independently of measurable units.
    return t(`units.freeQuantity.${key}`);
  }

  if (unit === Unit.PIECE) {
    const alias = item?.pieceAlias?.trim();
    if (alias) {
      return alias;
    }
    // Plain "piece" without alias: omit the generic "pièce" word if we have an item name —
    // the name itself is enough ("3 oeufs") and looks more natural.
    if (itemName && itemName.trim().length > 0) {
      return '';
    }
  }

  return getTranslatedUnitLabel(unit, quantity ?? 0, t);
};

/**
 * Formats a full "quantity + unit" string suitable for stock, shopping list, and recipe display.
 * Returns e.g.:
 *   - "3 gousses"       (pieceAlias = "gousse", qty = 3)
 *   - "pincée de"       (free-quantity; caller appends item name)
 *   - "200 g"           (measurable)
 *   - "3"               (plain piece without alias — caller appends pluralized item name)
 */
export const formatQuantityWithUnit = (
  quantity: number | string | null | undefined,
  unit: string,
  t: (key: string) => string,
  options: DisplayUnitOptions = {}
): string => {
  const label = getDisplayUnitLabel(unit, quantity, t, options);
  const isFree = options.isFreeQuantity || isFreeQuantityUnit(unit);
  if (isFree) {
    return label;
  }
  const qStr = quantity === null || quantity === undefined || quantity === '' ? '' : String(quantity);
  if (!label) return qStr;
  return qStr ? `${qStr} ${label}` : label;
};

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

export const sanitizeCategory = (category: string): string => {
  return isValidCategory(category) ? category : ItemCategory.OTHER;
};
