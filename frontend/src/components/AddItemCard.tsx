import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { Item } from '@/services/itemService';
import { QuantitySelector } from './QuantitySelector';
import { ItemSelector } from './ItemSelector';
import { SelectedItemPreview } from './SelectedItemPreview';
import { toast } from 'sonner';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

interface AddItemCardProps {
  title: string;
  onItemAdd: (item: Item, quantity: string, unit: string) => void;
  placeholder: string;
  buttonText: string;
  disabled?: boolean;
  storageAreaName?: string;
}

export const AddItemCard = ({ 
  title,
  onItemAdd,
  placeholder,
  buttonText,
  disabled = false,
  storageAreaName
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
      .min(1, { message: t('messages.error.invalidQuantity') })
      .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: t('messages.error.invalidQuantity')
      });

    const validationResult = quantitySchema.safeParse(newItemQuantity);

    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onItemAdd(selectedItem, validationResult.data, newItemUnit);
      
      // Show success toast with details
      const successMessage = storageAreaName 
        ? t('storageArea.addedQuantityToStorageArea', { quantity: validationResult.data, unit: newItemUnit, storageAreaName: storageAreaName })
        : t('pages.shopping.addedQuantity', { item: selectedItem.name, quantity: validationResult.data, unit: newItemUnit });
      toast.success(successMessage);
      
      // Reset form after successful addition
      setSelectedItem(null);
      setNewItemQuantity('1');
      setNewItemUnit('');
    } catch (error) {
      console.error('Failed to add item:', error);
      toast.error(t('messages.error.failedToAdd'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="h-5 w-5 text-green-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            {t('storageArea.selectItem')}
          </label>
          <ItemSelector
            onItemSelect={handleItemSelect}
            placeholder={placeholder}
            selectedItem={selectedItem}
            className="w-full"
          />
        </div>
        
        {selectedItem && (
          <div className="space-y-4">
            {/* Selected Item Preview */}
            <SelectedItemPreview 
              item={selectedItem} 
              onClear={() => setSelectedItem(null)} 
            />

            {/* Quantity Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">
                {storageAreaName 
                  ?  t(`storageArea.addItemTo`, { name: storageAreaName })
                  : t(`storageArea.addItem`)
                }
              </label>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <QuantitySelector
                    item={selectedItem}
                    initialQuantity={newItemQuantity}
                    initialUnit={newItemUnit}
                    onQuantityChange={handleQuantityChange}
                  />
                </div>
                <Button 
                  onClick={handleAddItem} 
                  className="px-6 min-w-[100px]"
                  disabled={disabled || isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('forms.adding')}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      {buttonText}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
