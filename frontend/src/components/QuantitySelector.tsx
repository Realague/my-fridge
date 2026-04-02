import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Item } from '@/services/itemService';
import { getUnitDisplayName, getUnitsForCategory } from '@/utils/unitSystem';
import { useTranslation } from 'react-i18next';
import { UnitConversionPopover } from './UnitConversionPopover';

const COOKING_UNIT_ML: Record<string, number> = {
  tbsp: 15,
  tsp: 5,
  cup: 240,
};

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
                  ({COOKING_UNIT_ML[availableUnit]} ml)
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
