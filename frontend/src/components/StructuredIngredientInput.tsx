import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { ItemSelector } from './ItemSelector';
import { QuantitySelector } from './QuantitySelector';
import { useTranslation } from 'react-i18next';

// Simplified item interface that matches what we get from the API
interface SimpleItem {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  availableUnits: string[];
}

// Full item interface for compatibility with ItemSelector
interface FullItem extends SimpleItem {
  createdBy: string | null;
  householdId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StructuredIngredient {
  id?: string;
  itemId: string;
  item?: SimpleItem;
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

  const handleItemSelect = (index: number, item: FullItem | null) => {
    if (item) {
      const simpleItem: SimpleItem = {
        id: item.id,
        name: item.name,
        category: item.category,
        defaultUnit: item.defaultUnit,
        availableUnits: item.availableUnits
      };
      
      updateIngredient(index, {
        itemId: item.id,
        item: simpleItem,
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
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
          <p>{t('ingredientInput.noIngredients')}</p>
          <p className="text-sm mt-1">{t('ingredientInput.clickToAdd')}</p>
        </div>
      )}

      <div className="space-y-3 ">
        {ingredients.map((ingredient, index) => (
          <div key={ingredient.id || `new-${index}`} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">{t('ingredientInput.item')}</Label>
                <ItemSelector
                  onItemSelect={(item) => handleItemSelect(index, item)}
                  selectedItem={ingredient.item ? {
                    ...ingredient.item,
                    createdBy: null,
                    householdId: null,
                    createdAt: '',
                    updatedAt: ''
                  } : null}
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
              variant="ghost"
              size="sm"
              onClick={() => removeIngredient(index)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
