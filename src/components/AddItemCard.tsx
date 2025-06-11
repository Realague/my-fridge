
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useItems, FoodItem } from '@/contexts/ItemContext';
import { QuantitySelector } from './QuantitySelector';
import { ItemSelector } from './ItemSelector';

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

  const handleItemSelect = (item: FoodItem) => {
    setSelectedItem(item);
    setNewItemUnit(item.defaultUnit);
  };

  const handleQuantityChange = (quantity: string, unit: string) => {
    setNewItemQuantity(quantity);
    setNewItemUnit(unit);
  };

  const handleAddItem = () => {
    if (selectedItem && newItemQuantity.trim()) {
      onItemAdd(selectedItem, newItemQuantity, newItemUnit);
      setSelectedItem(null);
      setNewItemQuantity('1');
      setNewItemUnit('');
      updateItemUsage(selectedItem.id);
    }
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
