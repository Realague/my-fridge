import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Item } from '@/services/itemService';
import { getUnitDisplayName, getUnitsForCategory } from '@/utils/unitSystem';
import { useTranslation } from 'react-i18next';
import { UnitConversionPopover } from './UnitConversionPopover';
import { Unit } from '@/types/enums';

const COOKING_UNIT_ML: Record<string, number> = {
  tbsp: 15,
  tsp: 5,
  cup: 240,
};

const WEIGHT_UNITS: string[] = [Unit.GRAM, Unit.KILOGRAM];

const CATEGORY_DENSITY: Record<string, number> = {
  grains: 0.5,
  spices: 1.2,
  condiments: 0.85,
  vegetables: 0.6,
  fruits: 0.7,
  meat: 0.9,
  snacks: 0.4,
  canned: 0.8,
  frozen: 0.8,
  dairy: 0.9,
  other: 0.7,
};

function getCookingUnitHint(cookingUnit: string, item: Item): string {
  const mlValue = COOKING_UNIT_ML[cookingUnit];
  if (!mlValue) return '';

  if (WEIGHT_UNITS.includes(item.defaultUnit)) {
    const density = CATEGORY_DENSITY[item.category] ?? 0.7;
    const grams = Math.round(mlValue * density);
    return `~${grams} g`;
  }

  return `${mlValue} ml`;
}

interface QuantitySelectorProps {
  item: Item;
  initialQuantity: string;
  initialUnit: string;
  onQuantityChange: (quantity: string, unit: string) => void;
  className?: string;
  context?: 'storage' | 'recipe';
}

export const QuantitySelector = ({
  item,
  initialQuantity,
  initialUnit,
  onQuantityChange,
  className = '',
  context = 'storage'
}: QuantitySelectorProps) => {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [unit, setUnit] = useState(initialUnit);

  // Ensure availableUnits is always an array and filtered by context
  const availableUnits = React.useMemo(() => {
    const categoryUnits = getUnitsForCategory(item.category, context);
    
    // For recipe context, always use category units (includes cooking measurements)
    if (context === 'recipe') {
      return categoryUnits.availableUnits;
    }
    
    // For storage context, filter by item's available units
    if (Array.isArray(item.availableUnits)) {
      // Filter item's available units by context-appropriate units
      return item.availableUnits.filter(unit => 
        categoryUnits.availableUnits.includes(unit)
      );
    }
    // If it's a string (JSON), try to parse it
    if (typeof item.availableUnits === 'string') {
      try {
        const parsed = JSON.parse(item.availableUnits);
        const parsedArray = Array.isArray(parsed) ? parsed : [item.defaultUnit];
        return parsedArray.filter(unit => 
          categoryUnits.availableUnits.includes(unit)
        );
      } catch {
        return [item.defaultUnit];
      }
    }
    // Fallback to category units
    return categoryUnits.availableUnits;
  }, [item.availableUnits, item.defaultUnit, item.category, context]);

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    onQuantityChange(value, unit);
  };

  const handleUnitChange = (value: string) => {
    setUnit(value);
    onQuantityChange(quantity, value);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Input
        type="number"
        value={quantity}
        onChange={(e) => handleQuantityChange(e.target.value)}
        placeholder="Qty"
        className="w-20"
        min="0"
        step="1"
      />
      <Select value={unit} onValueChange={handleUnitChange}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableUnits.map((availableUnit) => (
            <SelectItem key={availableUnit} value={availableUnit}>
              {t(`units.${getUnitDisplayName(availableUnit)}`)}
              {context === 'recipe' && COOKING_UNIT_ML[availableUnit] && (
                <span className="text-muted-foreground ml-1">
                  ({getCookingUnitHint(availableUnit, item)})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {context === 'recipe' && <UnitConversionPopover />}
    </div>
  );
};
