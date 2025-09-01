import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { Item } from '@/services/itemService';
import { QuantitySelector } from './QuantitySelector';
import { ItemSelector } from './ItemSelector';
import { toast } from 'sonner';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

interface AddItemCardProps {
  title?: string;
  onItemAdd: (item: Item, quantity: string, unit: string) => void;
  placeholder?: string;
  buttonText?: string;
  disabled?: boolean;
}

export const AddItemCard = ({ 
  title,
  onItemAdd,
  placeholder,
  buttonText,
  disabled = false
}: AddItemCardProps) => {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleItemSelect = (item: Item | null) => {
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

  const handleAddItem = async () => {
    if (!selectedItem) {
      toast.error(t('messages.error.selectItemFirst'));
      return;
    }

    if (isSubmitting) return; // Prevent double submission

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

    setIsSubmitting(true);
    
    try {
      await onItemAdd(selectedItem, validationResult.data, newItemUnit);
      
      // Reset form after successful addition
      setSelectedItem(null);
      setNewItemQuantity('1');
      setNewItemUnit('');
      
      toast.success(t('messages.success.itemAdded', { item: selectedItem.name }));
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error(t('messages.error.failedToAdd'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-5 w-5 text-green-600" />
          {title || t('pages.shopping.addItem')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
         <ItemSelector
          onItemSelect={handleItemSelect}
          placeholder={placeholder || t('forms.searchOrAddItem')}
          selectedItem={selectedItem}
          className="w-full"
        />
        
        {selectedItem && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
               <div className="text-sm text-gray-600 mb-2">
                 {t('forms.selected')}: <span className="font-medium">{selectedItem.name}</span>
                 {selectedItem.householdId && (
                   <Badge className="ml-2 text-xs bg-blue-100 text-blue-800">
                     {t('forms.householdItem')}
                   </Badge>
                 )}
               </div>
              <QuantitySelector
                item={selectedItem}
                initialQuantity={newItemQuantity}
                initialUnit={newItemUnit}
                onQuantityChange={handleQuantityChange}
              />
            </div>
            <Button 
              onClick={handleAddItem} 
              className="px-6"
              disabled={disabled || isSubmitting}
            >
               {isSubmitting ? (
                 <>
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                   {t('forms.adding')}
                 </>
               ) : (
                 buttonText || t('buttons.add')
               )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
