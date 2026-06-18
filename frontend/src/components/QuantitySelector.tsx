import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Item } from '@/services/itemService';
import { getUnitDisplayName, getUnitsForCategory, isFreeQuantityUnit } from '@/utils/unitSystem';
import { useTranslation } from 'react-i18next';
import { UnitConversionPopover } from './UnitConversionPopover';
import { Unit, FREE_QUANTITY_UNITS } from '@/types/enums';

const COOKING_UNIT_ML: Record<string, number> = {
  tbsp: 15,
  tsp: 5,
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
  /** Current free-quantity state (recipe context only). Undefined means uncontrolled. */
  isFreeQuantity?: boolean;
  /** Called when the user toggles the "à l'œil" checkbox (recipe context only). */
  onFreeQuantityChange?: (isFreeQuantity: boolean) => void;
}

export const QuantitySelector = ({
  item,
  initialQuantity,
  initialUnit,
  onQuantityChange,
  className = '',
  context = 'storage',
  isFreeQuantity: controlledIsFreeQuantity,
  onFreeQuantityChange,
}: QuantitySelectorProps) => {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [unit, setUnit] = useState(initialUnit);

  // Internal fallback when parent doesn't control isFreeQuantity. Seeded from
  // the initial unit so recipes loaded from the DB with a gestural unit start
  // with the checkbox ticked.
  const [internalFreeQuantity, setInternalFreeQuantity] = useState(
    controlledIsFreeQuantity ?? isFreeQuantityUnit(initialUnit)
  );

  const isFreeQuantity =
    controlledIsFreeQuantity !== undefined ? controlledIsFreeQuantity : internalFreeQuantity;

  // Auto-tick the checkbox when the user picks a gestural unit (pinch/drizzle/knob).
  // Auto-untick when they pick back a measurable unit.
  useEffect(() => {
    if (context !== 'recipe') return;
    const shouldBeFree = isFreeQuantityUnit(unit);
    if (shouldBeFree !== isFreeQuantity) {
      if (onFreeQuantityChange) {
        onFreeQuantityChange(shouldBeFree);
      } else {
        setInternalFreeQuantity(shouldBeFree);
      }
    }
    // Only react to unit changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, context]);

  // Ensure availableUnits is always an array and filtered by context
  const availableUnits = React.useMemo(() => {
    const categoryUnits = getUnitsForCategory(item.category, context);

    // For recipe context, always use category units (includes cooking measurements + free-quantity units).
    if (context === 'recipe') {
      return categoryUnits.availableUnits;
    }

    // For storage context, filter by item's available units
    if (Array.isArray(item.availableUnits)) {
      return item.availableUnits.filter(u =>
        categoryUnits.availableUnits.includes(u)
      );
    }
    if (typeof item.availableUnits === 'string') {
      try {
        const parsed = JSON.parse(item.availableUnits);
        const parsedArray = Array.isArray(parsed) ? parsed : [item.defaultUnit];
        return parsedArray.filter((u: string) =>
          categoryUnits.availableUnits.includes(u)
        );
      } catch {
        return [item.defaultUnit];
      }
    }
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

  const handleFreeQuantityToggle = (checked: boolean) => {
    if (onFreeQuantityChange) {
      onFreeQuantityChange(checked);
    } else {
      setInternalFreeQuantity(checked);
    }
    // Ensure the unit reflects the new state: pick a sensible default if the
    // user ticks the box while a measurable unit is selected.
    if (checked && !FREE_QUANTITY_UNITS.includes(unit as Unit)) {
      handleUnitChange(Unit.PINCH);
    } else if (!checked && FREE_QUANTITY_UNITS.includes(unit as Unit)) {
      handleUnitChange(item.defaultUnit || Unit.PIECE);
    }
  };

  const showFreeQuantityCheckbox = context === 'recipe';
  const hideNumericInput = context === 'recipe' && isFreeQuantity;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex gap-2 items-center">
        {!hideNumericInput && (
          <Input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            placeholder={t('forms.qtyPlaceholder')}
            className="w-20"
            min="0"
            step="1"
          />
        )}
        <Select value={unit} onValueChange={handleUnitChange}>
          <SelectTrigger className={hideNumericInput ? 'w-32' : 'w-24'}>
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
      {showFreeQuantityCheckbox && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <Checkbox
            checked={isFreeQuantity}
            onCheckedChange={(checked) => handleFreeQuantityToggle(Boolean(checked))}
          />
          <Label className="cursor-pointer">
            {t('pages.recipes.freeQuantity')}
          </Label>
        </label>
      )}
    </div>
  );
};
