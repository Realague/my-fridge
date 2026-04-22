import { ItemCategory, Unit } from '../types/enums';

/**
 * Maps item categories to default units and available units
 */
export function getUnitsForCategory(category: ItemCategory): {
  defaultUnit: Unit;
  availableUnits: Unit[];
} {
  switch (category) {
    case ItemCategory.FRUITS:
      return {
        defaultUnit: Unit.PIECE,
        availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM],
      };

    case ItemCategory.VEGETABLES:
      return {
        defaultUnit: Unit.PIECE,
        availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM],
      };

    case ItemCategory.MEAT:
      return {
        defaultUnit: Unit.KILOGRAM,
        availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE],
      };

    case ItemCategory.FISH:
      return {
        defaultUnit: Unit.KILOGRAM,
        availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE],
      };

    case ItemCategory.SEAFOOD:
      return {
        defaultUnit: Unit.KILOGRAM,
        availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE],
      };

    case ItemCategory.DAIRY:
      // Most dairy items are measured by weight, but liquids like milk use volume
      // We'll default to GRAM, but this can be overridden for specific items
      return {
        defaultUnit: Unit.GRAM,
        availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.MILLILITER, Unit.CENTILITER, Unit.LITER, Unit.PIECE],
      };

    case ItemCategory.BEVERAGES:
      return {
        defaultUnit: Unit.LITER,
        availableUnits: [Unit.LITER, Unit.CENTILITER, Unit.MILLILITER],
      };

    case ItemCategory.SPICES:
      return {
        defaultUnit: Unit.GRAM,
        availableUnits: [Unit.GRAM, Unit.KILOGRAM],
      };

    case ItemCategory.GRAINS:
      return {
        defaultUnit: Unit.KILOGRAM,
        availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.PIECE],
      };

    case ItemCategory.SNACKS:
      return {
        defaultUnit: Unit.GRAM,
        availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.PIECE],
      };

    case ItemCategory.CONDIMENTS:
      return {
        defaultUnit: Unit.GRAM,
        availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.MILLILITER, Unit.CENTILITER, Unit.LITER],
      };

    case ItemCategory.FROZEN:
      return {
        defaultUnit: Unit.PIECE,
        availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM],
      };

    case ItemCategory.CANNED:
      return {
        defaultUnit: Unit.PIECE,
        availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM],
      };

    case ItemCategory.MEAL:
      return {
        defaultUnit: Unit.PIECE,
        availableUnits: [Unit.PIECE, Unit.SERVING, Unit.GRAM, Unit.KILOGRAM],
      };

    case ItemCategory.PREPARATION:
      return {
        defaultUnit: Unit.GRAM,
        availableUnits: [Unit.GRAM, Unit.KILOGRAM],
      };

    case ItemCategory.CLEANING_PRODUCTS:
      return {
        defaultUnit: Unit.MILLILITER,
        availableUnits: [Unit.MILLILITER, Unit.CENTILITER, Unit.LITER],
      };

    case ItemCategory.OTHER:
    default:
      return {
        defaultUnit: Unit.PIECE,
        availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM, Unit.MILLILITER, Unit.CENTILITER, Unit.LITER],
      };
  }
}

/**
 * Maps category string from file to ItemCategory enum
 */
export function mapCategoryStringToEnum(categoryString: string): ItemCategory {
  const normalized = categoryString.toLowerCase().trim();
  
  const categoryMap: Record<string, ItemCategory> = {
    'vegetables': ItemCategory.VEGETABLES,
    'fruits': ItemCategory.FRUITS,
    'meat': ItemCategory.MEAT,
    'fish': ItemCategory.FISH,
    'seafood': ItemCategory.SEAFOOD,
    'dairy': ItemCategory.DAIRY,
    'grains': ItemCategory.GRAINS,
    'spices': ItemCategory.SPICES,
    'beverages': ItemCategory.BEVERAGES,
    'snacks': ItemCategory.SNACKS,
    'condiments': ItemCategory.CONDIMENTS,
    'frozen': ItemCategory.FROZEN,
    'canned': ItemCategory.CANNED,
    'meal': ItemCategory.MEAL,
    'preparation': ItemCategory.PREPARATION,
    'cleaning_products': ItemCategory.CLEANING_PRODUCTS,
    'other': ItemCategory.OTHER,
  };

  return categoryMap[normalized] || ItemCategory.OTHER;
}

