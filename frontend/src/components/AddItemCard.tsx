
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useItems, FoodItem } from '@/contexts/ItemContext';
import { QuantitySelector } from './QuantitySelector';
import { ItemSelector } from './ItemSelector';
import { toast } from 'sonner';
import { z } from 'zod';

interface AddItemCardProps {
  title?: string;
  onItemAdd: (item: FoodItem, quantity: string, unit: string) => void;
  placeholder?: string;
  buttonText?: string;
}

export const AddItemCard = ({ 
  title = "Add Item",
  onItemAdd,
  placeholder = "Search or add item...",
  buttonText = "Add"
}: AddItemCardProps) => {
  const { updateItemUsage } = useItems();
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('');

  const handleItemSelect = (item: FoodItem | null) => {
    setSelectedItem(item);
    if (item) {
      setNewItemQuantity('1');
      setNewItemUnit(item.defaultUnit);
    } else {
      // Reset quantity and unit when item is cleared
      setNewItemQuantity('1');
      setNewItemUnit('');
    }
  };

  const handleQuantityChange = (quantity: string, unit: string) => {
    setNewItemQuantity(quantity);
    setNewItemUnit(unit);
  };

  const handleAddItem = () => {
    if (!selectedItem) {
      toast.error("Please select an item first.");
      return;
    }

    const quantitySchema = z.string()
      .trim()
      .min(1, { message: "Quantity cannot be empty." })
      .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Quantity must be a positive number."
      });

    const validationResult = quantitySchema.safeParse(newItemQuantity);

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    onItemAdd(selectedItem, validationResult.data, newItemUnit);
    updateItemUsage(selectedItem.id);
    toast.success(`Added ${selectedItem.name} to the list.`);

    setSelectedItem(null);
    setNewItemQuantity('1');
    setNewItemUnit('');
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-5 w-5 text-green-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ItemSelector
          onItemSelect={handleItemSelect}
          placeholder={placeholder}
          selectedItem={selectedItem}
          className="w-full"
        />
        
        {selectedItem && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                Selected: <span className="font-medium">{selectedItem.name}</span>
              </p>
              <QuantitySelector
                item={selectedItem}
                initialQuantity={newItemQuantity}
                initialUnit={newItemUnit}
                onQuantityChange={handleQuantityChange}
              />
            </div>
            <Button onClick={handleAddItem} className="px-6">
              {buttonText}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
