import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Carrot, Plus, Trash2 } from 'lucide-react';
import { ItemSelector } from './ItemSelector';
import { QuantitySelector } from './QuantitySelector';
import { useTranslation } from 'react-i18next';
import { Item } from '@/services/itemService';

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
    <Card variant="elevated" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mf-green-soft">
              <Carrot className="h-5 w-5 text-mf-orange" />
            </span>
            {t('pages.recipes.ingredients')}
          </CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={addIngredient}
            className="rounded-full bg-mf-green-soft font-display font-semibold text-mf-green-deep hover:bg-mf-green-soft/70"
          >
            <Plus className="h-4 w-4" />
            {t('ingredientInput.addIngredient')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ingredients.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-mf-night-line bg-mf-night-elevated/30 px-6 py-10 text-center text-sm text-mf-text-mute">
            {t('ingredientInput.emptyState')}
          </div>
        )}

        <div className="space-y-3 ">
        {ingredients.map((ingredient, index) => (
          <div key={ingredient.id || `new-${index}`} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">{t('ingredientInput.item')}</Label>
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
                  className="mt-1"
                />
              </div>
              
              {ingredient.itemId && (
                <>
                  <div>
                    <Label className="text-sm">{t('ingredientInput.quantityAndUnit')}</Label>
                    <div className="mt-1">
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
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm">{t('ingredientInput.notes')}</Label>
                    <Input
                      value={ingredient.notes || ''}
                      onChange={(e) => updateIngredient(index, { notes: e.target.value })}
                      placeholder={t('ingredientInput.notesPlaceholder')}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>
            
            <Button
              type="button"
              variant="deleteTrash"
              size="sm"
              onClick={() => removeIngredient(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        </div>
      </CardContent>
    </Card>
  );
};
