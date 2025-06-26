import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { Item } from '@/services/itemService';
import { ItemSelector } from './ItemSelector';
import { QuantitySelector } from './QuantitySelector';

export interface StructuredIngredient {
  id: string;
  itemId: string;
  item?: Item;
  quantity: number;
  unit: string;
  notes?: string;
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
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null);

  const addIngredient = () => {
    const newIngredient: StructuredIngredient = {
      id: Date.now().toString(),
      itemId: '',
      quantity: 1,
      unit: 'piece',
      notes: ''
    };
    onIngredientsChange([...ingredients, newIngredient]);
    setEditingIngredient(newIngredient.id);
  };

  const updateIngredient = (id: string, updates: Partial<StructuredIngredient>) => {
    const updatedIngredients = ingredients.map(ingredient =>
      ingredient.id === id ? { ...ingredient, ...updates } : ingredient
    );
    onIngredientsChange(updatedIngredients);
  };

  const removeIngredient = (id: string) => {
    onIngredientsChange(ingredients.filter(ingredient => ingredient.id !== id));
  };

  const handleItemSelect = (index: number, item: Item | null) => {
    if (item) {
      updateIngredient(ingredients[index].id, {
        itemId: item.id,
        item: item, // Store the full item object
        unit: item.defaultUnit
      });
    } else {
      // Clear the selection
      updateIngredient(ingredients[index].id, {
        itemId: '',
        item: undefined,
        unit: 'piece'
      });
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Ingredients</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addIngredient}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Ingredient
        </Button>
      </div>

      {ingredients.length === 0 && (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
          <p>No ingredients added yet</p>
          <p className="text-sm mt-1">Click "Add Ingredient" to get started</p>
        </div>
      )}

      <div className="space-y-3">
        {ingredients.map((ingredient, index) => (
          <div key={ingredient.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">Item</Label>
                <ItemSelector
                  onItemSelect={(item) => handleItemSelect(index, item)}
                  selectedItem={ingredient.item || null} // Pass the selected item
                  placeholder="Select ingredient..."
                  className="mt-1"
                />
              </div>
              
              {ingredient.itemId && (
                <>
                  <div>
                    <Label className="text-sm">Quantity & Unit</Label>
                    <div className="mt-1">
                      <QuantitySelector
                        item={ingredient.item || {
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
                          updateIngredient(ingredient.id, {
                            quantity: parseFloat(quantity) || 0,
                            unit
                          });
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Notes (optional)</Label>
                    <Input
                      value={ingredient.notes || ''}
                      onChange={(e) => updateIngredient(ingredient.id, { notes: e.target.value })}
                      placeholder="e.g., diced, chopped fine..."
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
              onClick={() => removeIngredient(ingredient.id)}
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
