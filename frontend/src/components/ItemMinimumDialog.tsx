import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ItemSelector } from '@/components/ItemSelector';
import { QuantitySelector } from '@/components/QuantitySelector';
import { Item } from '@/services/itemService';
import { useItemMinimumStore } from '@/stores/itemMinimumStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useTranslation } from 'react-i18next';
import { Unit } from '@/types/enums';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { getItemDisplayName } from '@/utils/itemUtils';

interface ItemMinimumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId?: string;
  existingMinimumId?: string;
}

export const ItemMinimumDialog = ({ open, onOpenChange, itemId, existingMinimumId }: ItemMinimumDialogProps) => {
  const { t } = useTranslation();
  const { createItemMinimum, updateItemMinimum, getItemMinimumById } = useItemMinimumStore();
  const { getStoredItemsByItemAndUnit } = useStoredItemStore();
  
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<Unit>(Unit.PIECE);
  const [loading, setLoading] = useState(false);

  // Load existing minimum if editing
  useEffect(() => {
    if (open && existingMinimumId) {
      const existing = getItemMinimumById(existingMinimumId);
      if (existing && existing.item) {
        setSelectedItem(existing.item as Item);
        setQuantity(existing.minimumQuantity.toString());
        setUnit(existing.minimumUnit);
      }
    }
  }, [open, existingMinimumId, getItemMinimumById]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedItem(null);
      setQuantity('1');
      setUnit(Unit.PIECE);
    }
  }, [open]);

  const handleItemSelect = (item: Item | null) => {
    setSelectedItem(item);
    if (item) {
      setUnit(item.defaultUnit as Unit);
    }
  };

  const handleQuantityChange = (newQuantity: string, newUnit: string) => {
    setQuantity(newQuantity);
    setUnit(newUnit as Unit);
    calculateCurrentStock();
  };

  const calculateCurrentStock = () => {
    if (!selectedItem) return 0;
    const storedItems = getStoredItemsByItemAndUnit(selectedItem.id, unit);
    // Sum up all quantities (assuming same unit for simplicity)
    return storedItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleSave = async () => {
    if (!selectedItem || !quantity.trim()) {
      toast.error(t('messages.error.selectItemFirst'));
      return;
    }

    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
      toast.error(t('messages.error.invalidQuantity'));
      return;
    }

    setLoading(true);
    try {
      if (existingMinimumId) {
        await updateItemMinimum(existingMinimumId, {
          minimumQuantity: numQuantity,
          minimumUnit: unit,
        });
        toast.success(t('itemMinimum.minimumUpdated'));
      } else {
        await createItemMinimum({
          itemId: selectedItem.id,
          minimumQuantity: numQuantity,
          minimumUnit: unit,
        });
        toast.success(t('itemMinimum.minimumSet'));
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(t('itemMinimum.minimumSetFailed'));
      console.error('Failed to save minimum:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentStock = calculateCurrentStock();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingMinimumId ? t('itemMinimum.editMinimum') : t('itemMinimum.setMinimum')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Item Selector */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t('itemMinimum.selectItem')}
            </Label>
            <ItemSelector
              onItemSelect={handleItemSelect}
              placeholder={t('forms.searchOrAddItem')}
              selectedItem={selectedItem}
            />
          </div>

          {/* Current Stock Info */}
          {selectedItem && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Package className="h-4 w-4" />
                <span>{t('itemMinimum.currentStock')}</span>
              </div>
              <div className="text-lg font-semibold">
                {currentStock} {unit}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          {selectedItem && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('itemMinimum.minimumQuantity')}
              </Label>
              <QuantitySelector
                item={selectedItem}
                initialQuantity={quantity}
                initialUnit={unit}
                onQuantityChange={handleQuantityChange}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('buttons.cancel')}
          </Button>
          <Button
            variant="green"
            onClick={handleSave}
            disabled={!selectedItem || loading}
          >
            {loading ? t('forms.adding') : t('buttons.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
