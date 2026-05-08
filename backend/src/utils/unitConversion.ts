import { Unit, LINE_STORAGE_UNITS } from '../types/enums';

// Conversion rates to base units (grams for weight, milliliters for volume)
const WEIGHT_CONVERSIONS: Record<string, number> = {
  [Unit.GRAM]: 1,
  [Unit.KILOGRAM]: 1000,
};

const VOLUME_CONVERSIONS: Record<string, number> = {
  [Unit.MILLILITER]: 1,
  [Unit.CENTILITER]: 10,
  [Unit.LITER]: 1000,
  // Cooking measurements (approximate conversions)
  [Unit.TABLESPOON]: 15,  // 1 tbsp = 15ml
  [Unit.TEASPOON]: 5,     // 1 tsp = 5ml
};

// Unit categories for conversion
export enum UnitType {
  WEIGHT = 'weight',
  VOLUME = 'volume',
  COUNT = 'count',
  OTHER = 'other'
}

// Categorize units
export function getUnitType(unit: string): UnitType {
  if (unit in WEIGHT_CONVERSIONS) return UnitType.WEIGHT;
  if (unit in VOLUME_CONVERSIONS) return UnitType.VOLUME;
  if ([Unit.PIECE, Unit.SERVING].includes(unit as Unit)) return UnitType.COUNT;
  return UnitType.OTHER;
}

// Check if two units can be converted to each other
export function canConvertUnits(fromUnit: string, toUnit: string): boolean {
  const fromType = getUnitType(fromUnit);
  const toType = getUnitType(toUnit);
  return fromType === toType && fromType !== UnitType.COUNT && fromType !== UnitType.OTHER;
}

// Convert quantity from one unit to another
export function convertQuantity(quantity: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return quantity;
  if (!canConvertUnits(fromUnit, toUnit)) return null;

  const unitType = getUnitType(fromUnit);
  
  if (unitType === UnitType.WEIGHT) {
    const fromConversion = WEIGHT_CONVERSIONS[fromUnit];
    const toConversion = WEIGHT_CONVERSIONS[toUnit];
    if (fromConversion === undefined || toConversion === undefined) return null;
    const baseQuantity = quantity * fromConversion;
    return baseQuantity / toConversion;
  }

  if (unitType === UnitType.VOLUME) {
    const fromConversion = VOLUME_CONVERSIONS[fromUnit];
    const toConversion = VOLUME_CONVERSIONS[toUnit];
    if (fromConversion === undefined || toConversion === undefined) return null;
    const baseQuantity = quantity * fromConversion;
    return baseQuantity / toConversion;
  }

  return null;
}

// Normalize to base unit (grams for weight, ml for volume)
export interface NormalizedQuantity {
  quantity: number;
  unit: string;
  originalQuantity: number;
  originalUnit: string;
}

export function normalizeToBaseUnit(quantity: number, unit: string): NormalizedQuantity {
  const unitType = getUnitType(unit);
  
  if (unitType === UnitType.WEIGHT && WEIGHT_CONVERSIONS[unit]) {
    return {
      quantity: quantity * WEIGHT_CONVERSIONS[unit],
      unit: Unit.GRAM,
      originalQuantity: quantity,
      originalUnit: unit
    };
  }
  
  if (unitType === UnitType.VOLUME && VOLUME_CONVERSIONS[unit]) {
    return {
      quantity: quantity * VOLUME_CONVERSIONS[unit],
      unit: Unit.MILLILITER,
      originalQuantity: quantity,
      originalUnit: unit
    };
  }
  
  // For count and other types, return as-is
  return {
    quantity,
    unit,
    originalQuantity: quantity,
    originalUnit: unit
  };
}

// Get the best display unit for a quantity (prefer kg over 1000g, etc.)
// For shopping lists (forStorage = true), only return storage-appropriate units
export function getBestDisplayUnit(quantity: number, baseUnit: string, forStorage: boolean = false): { quantity: number; unit: string } {
  if (baseUnit === Unit.GRAM) {
    if (quantity >= 1000) {
      return {
        quantity: quantity / 1000,
        unit: Unit.KILOGRAM
      };
    }
    return { quantity, unit: baseUnit };
  }
  
  if (baseUnit === Unit.MILLILITER) {
    if (quantity >= 1000) {
      return {
        quantity: quantity / 1000,
        unit: Unit.LITER
      };
    }
    // For storage lists, prefer larger units for better readability
    if (forStorage && quantity >= 100) {
      return {
        quantity: quantity / 10,
        unit: Unit.CENTILITER
      };
    }
    return { quantity, unit: baseUnit };
  }
  
  return { quantity, unit: baseUnit };
}

// Ingredient density estimates for volume-to-weight conversions (grams per ml)
// These are approximate values for common ingredients
const INGREDIENT_DENSITIES: Record<string, number> = {
  // Liquids (close to water density)
  'water': 1.0,
  'milk': 1.03,
  'oil': 0.92,
  
  // Dry ingredients (grams per ml when measured)
  'flour': 0.5,      // 1 cup (240ml) ≈ 120g
  'sugar': 0.85,     // 1 cup (240ml) ≈ 200g
  'salt': 1.2,       // 1 tsp (5ml) ≈ 6g
  'rice': 0.8,       // 1 cup (240ml) ≈ 190g
  'butter': 0.96,    // 1 tbsp (15ml) ≈ 14g
};

// Convert volume cooking measurements to weight for dry ingredients
// This requires knowing the ingredient type to apply the correct density
export function convertVolumeToWeight(quantity: number, volumeUnit: string, ingredientCategory?: string): { quantity: number; unit: string } | null {
  // Only convert volume units
  if (!VOLUME_CONVERSIONS[volumeUnit]) {
    return null;
  }
  
  // Convert to ml first
  const normalized = normalizeToBaseUnit(quantity, volumeUnit);
  const volumeInMl = normalized.quantity;
  
  // Determine density based on ingredient category
  // Default to keeping as volume if we don't have density data
  let density = null;
  
  // Map categories to density estimates
  if (ingredientCategory) {
    const categoryLower = ingredientCategory.toLowerCase();
    if (categoryLower.includes('flour') || categoryLower === 'grains') {
      density = INGREDIENT_DENSITIES.flour;
    } else if (categoryLower.includes('sugar') || categoryLower === 'condiments') {
      density = INGREDIENT_DENSITIES.sugar;
    } else if (categoryLower === 'spices') {
      density = INGREDIENT_DENSITIES.salt; // Use salt density for spices
    } else if (categoryLower === 'beverages' || categoryLower === 'dairy') {
      density = INGREDIENT_DENSITIES.milk;
    }
  }
  
  if (density) {
    // Convert to grams
    const weightInGrams = volumeInMl * density;
    return getBestDisplayUnit(weightInGrams, Unit.GRAM, true);
  }
  
  return null;
}

// Convert recipe units to storage-appropriate units for shopping lists
// This ensures cooking measurements (cup, tbsp, tsp) are converted to ml, cl, l, or g/kg
export function convertToStorageUnit(quantity: number, unit: string, itemCategory?: string): { quantity: number; unit: string } {
  // If already a storage unit, return as-is
  if (LINE_STORAGE_UNITS.includes(unit as Unit)) {
    return { quantity, unit };
  }
  
  // Try to convert volume to weight for dry ingredients
  if (itemCategory) {
    const weightConversion = convertVolumeToWeight(quantity, unit, itemCategory);
    if (weightConversion) {
      return weightConversion;
    }
  }
  
  // Otherwise, convert cooking measurements to milliliters
  const normalized = normalizeToBaseUnit(quantity, unit);
  
  // Then get the best storage-appropriate display unit
  return getBestDisplayUnit(normalized.quantity, normalized.unit, true);
}

// Aggregate quantities of items with different units
export interface AggregatedQuantity {
  totalQuantity: number;
  displayUnit: string;
  breakdown: Array<{ quantity: number; unit: string}>;
  canAggregate: boolean;
}

export function aggregateQuantities(items: Array<{ quantity: number; unit: string }>): AggregatedQuantity {
  if (items.length === 0) {
    return {
      totalQuantity: 0,
      displayUnit: Unit.PIECE,
      breakdown: [],
      canAggregate: false
    };
  }

  // Group by unit type
  const typeGroups = new Map<UnitType, Array<{ quantity: number; unit: string}>>();
  
  items.forEach(item => {
    const type = getUnitType(item.unit);
    if (!typeGroups.has(type)) {
      typeGroups.set(type, []);
    }
    typeGroups.get(type)!.push(item);
  });

  // If all items are the same type and convertible, aggregate them
  if (typeGroups.size === 1) {
    const entries = Array.from(typeGroups.entries());
    const firstEntry = entries[0];
    if (!firstEntry) {
      return {
        totalQuantity: 0,
        displayUnit: Unit.PIECE,
        breakdown: items,
        canAggregate: false
      };
    }
    
    const [type, groupItems] = firstEntry;
    
    if (type === UnitType.WEIGHT || type === UnitType.VOLUME) {
      // Normalize all to base unit and sum
      const normalized = groupItems.map((item: { quantity: number; unit: string; }) => normalizeToBaseUnit(item.quantity, item.unit));
      const totalInBaseUnit = normalized.reduce((sum: any, item: { quantity: any; }) => sum + item.quantity, 0);
      const baseUnit = normalized[0]?.unit ?? Unit.GRAM;
      
      // Get best display unit (use forStorage=true to ensure storage-appropriate units)
      const display = getBestDisplayUnit(totalInBaseUnit, baseUnit, true);
      
      return {
        totalQuantity: display.quantity,
        displayUnit: display.unit,
        breakdown: items,
        canAggregate: true
      };
    }
  }

  // Cannot aggregate - return breakdown only
  return {
    totalQuantity: 0,
    displayUnit: items[0]?.unit ?? Unit.PIECE,
    breakdown: items,
    canAggregate: false
  };
}
