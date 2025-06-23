import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Item } from '@/services/itemService';
import { getUnitDisplayName } from '@/utils/unitSystem';

interface QuantitySelectorProps {
  item: Item;
  initialQuantity: string;
  initialUnit: string;
  onQuantityChange: (quantity: string, unit: string) => void;
  className?: string;
}

export const QuantitySelector = ({
  item,
  initialQuantity,
  initialUnit,
  onQuantityChange,
  className = ''
}: QuantitySelectorProps) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [unit, setUnit] = useState(initialUnit);

  // Ensure availableUnits is always an array (handle cases where it might be a string from DB)
  const availableUnits = React.useMemo(() => {
    if (Array.isArray(item.availableUnits)) {
      return item.availableUnits;
    }
    // If it's a string (JSON), try to parse it
    if (typeof item.availableUnits === 'string') {
      try {
        const parsed = JSON.parse(item.availableUnits);
        return Array.isArray(parsed) ? parsed : [item.defaultUnit];
      } catch {
        return [item.defaultUnit];
      }
    }
    // Fallback to default unit
    return [item.defaultUnit];
  }, [item.availableUnits, item.defaultUnit]);

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
        step="0.1"
      />
      <Select value={unit} onValueChange={handleUnitChange}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableUnits.map((availableUnit) => (
            <SelectItem key={availableUnit} value={availableUnit}>
              {getUnitDisplayName(availableUnit)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
