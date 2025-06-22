
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FoodItem } from '@/contexts/ItemContext';

interface QuantitySelectorProps {
  item: FoodItem;
  initialQuantity?: string;
  initialUnit?: string;
  onQuantityChange: (quantity: string, unit: string) => void;
  className?: string;
}

export const QuantitySelector = ({ 
  item, 
  initialQuantity = '1', 
  initialUnit, 
  onQuantityChange, 
  className 
}: QuantitySelectorProps) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [unit, setUnit] = useState(initialUnit || item.defaultUnit);

  const handleQuantityChange = (newQuantity: string) => {
    setQuantity(newQuantity);
    onQuantityChange(newQuantity, unit);
  };

  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit);
    onQuantityChange(quantity, newUnit);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Input
        type="number"
        min="0"
        step="0.1"
        value={quantity}
        onChange={(e) => handleQuantityChange(e.target.value)}
        placeholder="Qty"
        className="w-20"
      />
      <Select value={unit} onValueChange={handleUnitChange}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {item.availableUnits.map((availableUnit) => (
            <SelectItem key={availableUnit} value={availableUnit}>
              {availableUnit}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
