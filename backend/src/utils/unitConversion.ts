import { Unit } from '../types/enums';

// Conversion rates to base units (grams for weight, milliliters for volume)
const WEIGHT_CONVERSIONS: Record<string, number> = {
  [Unit.GRAM]: 1,
  [Unit.KILOGRAM]: 1000,
};

const VOLUME_CONVERSIONS: Record<string, number> = {
  [Unit.MILLILITER]: 1,
  [Unit.CENTILITER]: 10,
  [Unit.LITER]: 1000,
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
  if ([Unit.PIECE, Unit.PACK, Unit.BUNCH, Unit.DOZEN].includes(unit as Unit)) return UnitType.COUNT;
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
export function getBestDisplayUnit(quantity: number, baseUnit: string): { quantity: number; unit: string } {
  if (baseUnit === Unit.GRAM && quantity >= 1000) {
    return {
      quantity: quantity / 1000,
      unit: Unit.KILOGRAM
    };
  }
  
  if (baseUnit === Unit.MILLILITER && quantity >= 1000) {
    return {
      quantity: quantity / 1000,
      unit: Unit.LITER
    };
  }
  
  return { quantity, unit: baseUnit };
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
      
      // Get best display unit
      const display = getBestDisplayUnit(totalInBaseUnit, baseUnit);
      
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
