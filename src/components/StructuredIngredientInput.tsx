
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { useItems } from '@/contexts/ItemContext';
import { RecipeIngredient } from '@/contexts/RecipeContext';
import { QuantitySelector } from './QuantitySelector';

interface StructuredIngredientInputProps {
  ingredients: RecipeIngredient[];
  onIngredientsChange: (ingredients: RecipeIngredient[]) => void;
}

export const StructuredIngredientInput = ({ 
  ingredients, 
  onIngredientsChange 
}: StructuredIngredientInputProps) => {
  const { items, getItemById } = useItems();

  const addIngredient = () => {
    const newIngredient: RecipeIngredient = {
      id: Date.now().toString(),
      itemId: '',
      quantity: 1,
      unit: 'pieces',
      notes: ''
    };
    onIngredientsChange([...ingredients, newIngredient]);
  };

  const removeIngredient = (index: number) => {
    onIngredientsChange(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, updates: Partial<RecipeIngredient>) => {
    const updated = ingredients.map((ingredient, i) => 
      i === index ? { ...ingredient, ...updates } : ingredient
    );
    onIngredientsChange(updated);
  };

  const handleQuantityChange = (index: number, quantity: string, unit: string) => {
    updateIngredient(index, { 
      quantity: parseFloat(quantity) || 0, 
      unit 
    });
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ingredients</CardTitle>
            <p className="text-sm text-gray-600">Select items and specify quantities</p>
          </div>
          <Button type="button" onClick={addIngredient} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {ingredients.length === 0 && (
          <p className="text-gray-500 text-center py-4">No ingredients added yet</p>
        )}
        
        {ingredients.map((ingredient, index) => {
          const selectedItem = ingredient.itemId ? getItemById(ingredient.itemId) : null;
          
          return (
            <div key={ingredient.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Ingredient {index + 1}
                </span>
                {ingredients.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Item</label>
                  <Select 
                    value={ingredient.itemId} 
                    onValueChange={(value) => updateIngredient(index, { itemId: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select an item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedItem && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Quantity</label>
                    <div className="mt-1">
                      <QuantitySelector
                        item={selectedItem}
                        initialQuantity={ingredient.quantity.toString()}
                        initialUnit={ingredient.unit}
                        onQuantityChange={(quantity, unit) => handleQuantityChange(index, quantity, unit)}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
                <Input
                  placeholder="e.g., chopped, fresh, cooked..."
                  value={ingredient.notes || ''}
                  onChange={(e) => updateIngredient(index, { notes: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
