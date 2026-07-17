import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Carrot, Plus, ShoppingCart, X } from 'lucide-react';
import { ItemSelector } from './ItemSelector';
import { QuantitySelector } from './QuantitySelector';
import { useTranslation } from 'react-i18next';
import { Item } from '@/services/itemService';
import { cn } from '@/lib/utils';

export interface StructuredIngredient {
  id?: string;
  itemId: string;
  item?: Item;
  // Null when `isFreeQuantity` is true (ingredient "à l'œil").
  quantity: number | null;
  unit: string;
  isFreeQuantity?: boolean;
  notes?: string;
  usedInSteps?: number[];
}

interface StructuredIngredientInputProps {
  ingredients: StructuredIngredient[];
  onIngredientsChange: (ingredients: StructuredIngredient[]) => void;
  className?: string;
}

export const StructuredIngredientInput = ({
  ingredients,
  onIngredientsChange,
  className = ''
}: StructuredIngredientInputProps) => {
  const { t } = useTranslation();
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null);

  const addIngredient = () => {
    const newIngredient: StructuredIngredient = {
      itemId: '',
      quantity: 1,
      unit: 'piece',
      isFreeQuantity: false,
      notes: ''
    };
    onIngredientsChange([...ingredients, newIngredient]);
    setEditingIngredient(ingredients.length.toString()); // Use index as editing identifier
  };

  const updateIngredient = (index: number, updates: Partial<StructuredIngredient>) => {
    const updatedIngredients = ingredients.map((ingredient, i) =>
      i === index ? { ...ingredient, ...updates } : ingredient
    );
    onIngredientsChange(updatedIngredients);
  };

  const removeIngredient = (index: number) => {
    onIngredientsChange(ingredients.filter((_, i) => i !== index));
  };

  const handleItemSelect = (index: number, item: Item | null) => {
    if (item) {
      updateIngredient(index, {
        itemId: item.id,
        item: item,
        unit: item.defaultUnit
      });
    } else {
      updateIngredient(index, {
        itemId: '',
        item: undefined,
        unit: 'piece'
      });
    }
  };

  // Get excluded items (all other ingredients that have been selected)
  const getExcludedItems = (currentIndex: number): Item[] => {
    return ingredients
      .filter((_, index) => index !== currentIndex && _.itemId)
      .map(ingredient => ({
        id: ingredient.itemId,
        name: ingredient.item?.name || '',
        category: ingredient.item?.category || 'other',
        defaultUnit: ingredient.item?.defaultUnit || 'piece',
        availableUnits: ingredient.item?.availableUnits || ['piece'],
        imageUrl: ingredient.item?.imageUrl || null,
        createdBy: null,
        householdId: null,
        createdAt: '',
        updatedAt: ''
      }));
  };

  return (
    <div className={cn('rounded-[22px] bg-card p-5 shadow-[var(--mf-shadow-2)] sm:p-6', className)}>
      {/* Panel header */}
      <div className="flex items-center gap-3">
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-mf-green-soft">
          <Carrot className="h-[18px] w-[18px] text-mf-green-deep" />
        </span>
        <h3 className="font-display text-xl font-bold tracking-tight">
          {t('pages.recipes.ingredients')}
        </h3>
        <span className="ml-auto font-display text-[13px] font-bold text-mf-text-mute">
          {ingredients.length}
        </span>
      </div>
      <p className="mb-3 ml-[46px] text-[13px] text-mf-text-soft">
        {t('pages.recipes.editor.ingredientsSubtitle')}
      </p>

      {ingredients.length === 0 && (
        <div className="px-2 py-3 text-center text-sm text-mf-text-mute">
          {t('ingredientInput.emptyState')}
        </div>
      )}

      {/* Rows, separated by dashed rules like the mock */}
      <div>
        {ingredients.map((ingredient, index) => (
          <div
            key={ingredient.id || `new-${index}`}
            className={cn(
              'space-y-2 py-2.5',
              index > 0 && 'border-t border-dashed border-mf-night-line'
            )}
          >
            <div className="flex items-center gap-2">
              <ItemSelector
                onItemSelect={(item) => handleItemSelect(index, item)}
                selectedItem={ingredient.item ? {
                  ...ingredient.item,
                  createdBy: null,
                  createdAt: '',
                  updatedAt: ''
                } : null}
                excludedItems={getExcludedItems(index)}
                excludeCleaningProducts={true}
                placeholder={t('ingredientInput.selectIngredient')}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                aria-label={t('messages.action.delete')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-mf-text-mute transition-colors hover:bg-mf-red-soft hover:text-mf-red"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {ingredient.itemId && (
              <div className="flex flex-wrap items-start gap-2">
                <QuantitySelector
                  item={ingredient.item ? {
                    ...ingredient.item,
                    createdBy: null,
                    householdId: null,
                    createdAt: '',
                    updatedAt: ''
                  } : {
                    id: ingredient.itemId,
                    name: '',
                    category: 'other',
                    defaultUnit: ingredient.unit,
                    availableUnits: [ingredient.unit, 'piece', 'tsp', 'tbsp'],
                    imageUrl: null,
                    createdBy: null,
                    householdId: null,
                    createdAt: '',
                    updatedAt: ''
                  }}
                  initialQuantity={
                    ingredient.quantity === null || ingredient.quantity === undefined
                      ? ''
                      : ingredient.quantity.toString()
                  }
                  initialUnit={ingredient.unit}
                  onQuantityChange={(quantity, unit) => {
                    updateIngredient(index, {
                      quantity: quantity === '' ? null : (parseFloat(quantity) || 0),
                      unit,
                    });
                  }}
                  isFreeQuantity={Boolean(ingredient.isFreeQuantity)}
                  onFreeQuantityChange={(isFree) => {
                    updateIngredient(index, {
                      isFreeQuantity: isFree,
                      // When switching to free-quantity, clear the numeric value
                      // so the DTO carries null through to the backend.
                      ...(isFree ? { quantity: null } : {}),
                    });
                  }}
                  context="recipe"
                />
                <Input
                  value={ingredient.notes || ''}
                  onChange={(e) => updateIngredient(index, { notes: e.target.value })}
                  placeholder={t('ingredientInput.notesPlaceholder')}
                  className="min-w-[120px] flex-1"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add ingredient */}
      <button
        type="button"
        onClick={addIngredient}
        className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-dashed border-mf-night-line p-3 font-display text-[13.5px] font-bold text-mf-green-deep transition-colors hover:border-mf-green hover:bg-mf-green-soft"
      >
        <Plus className="h-4 w-4" />
        {t('ingredientInput.addIngredient')}
      </button>

      {/* Footer hint */}
      <div className="mt-4 flex items-center gap-2 border-t border-mf-night-line pt-3.5 text-[12.5px] text-mf-text-soft">
        <ShoppingCart className="h-[15px] w-[15px] shrink-0 text-mf-green-deep" />
        {t('pages.recipes.editor.shoppingHint')}
      </div>
    </div>
  );
};
