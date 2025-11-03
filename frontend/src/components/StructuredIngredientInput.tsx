import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { ItemSelector } from './ItemSelector';
import { QuantitySelector } from './QuantitySelector';
import { useTranslation } from 'react-i18next';
import { Item } from '@/services/itemService';

export interface StructuredIngredient {
  id?: string;
  itemId: string;
  item?: Item;
  quantity: number;
  unit: string;
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
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{t('pages.recipes.ingredients')}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addIngredient}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('ingredientInput.addIngredient')}
        </Button>
      </div>

      {ingredients.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <p>{t('ingredientInput.noIngredients')}</p>
          <p className="text-sm mt-1">{t('ingredientInput.clickToAdd')}</p>
        </div>
      )}

      <div className="space-y-3 ">
        {ingredients.map((ingredient, index) => (
          <div key={ingredient.id || `new-${index}`} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card">
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
                          availableUnits: [ingredient.unit, 'piece', 'cup', 'tsp', 'tbsp'],
                          imageUrl: null,
                          createdBy: null,
                          householdId: null,
                          createdAt: '',
                          updatedAt: ''
                        }}
                        initialQuantity={ingredient.quantity.toString()}
                        initialUnit={ingredient.unit}
                        onQuantityChange={(quantity, unit) => {
                          updateIngredient(index, {
                            quantity: parseFloat(quantity) || 0,
                            unit
                          });
                        }}
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
    </div>
  );
};
