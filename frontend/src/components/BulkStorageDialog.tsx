import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Package, PackageCheck, CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ShoppingItem } from '@/stores/shoppingStore';
import { StorageArea } from '@/services/storageAreaService';
import { getSuggestedStorageAreaId } from '@/utils/categoryStorageMapping';
import { StorageAreaIcon } from '@/utils/storageAreaIcons';
import { getItemDisplayName } from '@/utils/itemUtils';
import { formatQuantityWithUnit } from '@/utils/unitSystem';
import { ItemImage } from '@/components/ItemImage';
import { StorageAreaType } from '@/types/enums';

interface BulkStorageItem {
  shoppingItem: ShoppingItem;
  selected: boolean;
  storageAreaId: string;
  expirationDate: string;
}

interface BulkStorageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingItems: ShoppingItem[];
  storageAreas: StorageArea[];
  onConfirm: (items: Array<{
    shoppingItemId: string;
    storageAreaId: string;
    expirationDate?: string;
  }>) => Promise<void>;
  onSkipAll: () => void;
}

export function BulkStorageDialog({
  open,
  onOpenChange,
  pendingItems,
  storageAreas,
  onConfirm,
  onSkipAll,
}: BulkStorageDialogProps) {
  const { t } = useTranslation();

  const initialItems = useMemo(() => {
    return pendingItems.map(item => ({
      shoppingItem: item,
      selected: true,
      storageAreaId: getSuggestedStorageAreaId(item.item?.category, storageAreas) || '',
      expirationDate: '',
    }));
  }, [pendingItems, storageAreas]);

  const [bulkItems, setBulkItems] = useState<BulkStorageItem[]>(initialItems);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (open) {
      setBulkItems(initialItems);
    }
  }, [open, initialItems]);

  const selectedCount = bulkItems.filter(i => i.selected).length;
  const allSelected = selectedCount === bulkItems.length;

  const toggleAll = () => {
    const newSelected = !allSelected;
    setBulkItems(prev => prev.map(item => ({ ...item, selected: newSelected })));
  };

  const toggleItem = (index: number) => {
    setBulkItems(prev => prev.map((item, i) =>
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  const updateStorageArea = (index: number, storageAreaId: string) => {
    setBulkItems(prev => prev.map((item, i) =>
      i === index ? { ...item, storageAreaId } : item
    ));
  };

  const updateExpirationDate = (index: number, expirationDate: string) => {
    setBulkItems(prev => prev.map((item, i) =>
      i === index ? { ...item, expirationDate } : item
    ));
  };

  const handleConfirm = async () => {
    const selectedItems = bulkItems
      .filter(i => i.selected && i.storageAreaId)
      .map(i => ({
        shoppingItemId: i.shoppingItem.id,
        storageAreaId: i.storageAreaId,
        expirationDate: i.expirationDate || undefined,
      }));

    if (selectedItems.length === 0) return;

    setSubmitting(true);
    try {
      await onConfirm(selectedItems);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const getStorageAreaName = (storageAreaId: string): string => {
    const area = storageAreas.find(a => a.id === storageAreaId);
    return area ? area.name : '';
  };

  const isFreezer = (storageAreaId: string): boolean => {
    const area = storageAreas.find(a => a.id === storageAreaId);
    return area?.type === StorageAreaType.FREEZER;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-mf-green" />
            {t('pages.shopping.bulkStorageTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b border-border">
          <button
            onClick={toggleAll}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {allSelected ? t('pages.shopping.deselectAll') : t('pages.shopping.selectAll')}
          </button>
          <span className="text-sm text-muted-foreground">
            {selectedCount}/{bulkItems.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-0">
          {bulkItems.map((bulkItem, index) => {
            const itemData = bulkItem.shoppingItem.item;
            if (!itemData) return null;

            return (
              <div
                key={bulkItem.shoppingItem.id}
                className={`rounded-lg border p-3 transition-colors ${
                  bulkItem.selected
                    ? 'border-mf-green/30 bg-mf-green-soft/60'
                    : 'border-border bg-muted/30 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={bulkItem.selected}
                    onCheckedChange={() => toggleItem(index)}
                  />
                  <ItemImage
                    src={itemData.imageUrl}
                    alt={getItemDisplayName(itemData, t)}
                    containerClassName="w-8 h-8 rounded-md"
                    fallbackIconSize={32}
                    category={itemData.category}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm truncate block">
                      {getItemDisplayName(itemData, t)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatQuantityWithUnit(bulkItem.shoppingItem.quantity, bulkItem.shoppingItem.unit, t, {
                        item: itemData,
                        itemName: getItemDisplayName(itemData, t),
                      })}
                    </span>
                  </div>
                </div>

                {bulkItem.selected && (
                  <div className="mt-2 flex gap-2 pl-9">
                    <Select
                      value={bulkItem.storageAreaId}
                      onValueChange={(val) => updateStorageArea(index, val)}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder={t('pages.shopping.selectStorageArea')} />
                      </SelectTrigger>
                      <SelectContent>
                        {storageAreas.map(area => (
                          <SelectItem key={area.id} value={area.id}>
                            <span className="flex items-center gap-1.5">
                              <StorageAreaIcon type={area.type} className="h-3.5 w-3.5" />
                              <span>{area.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!isFreezer(bulkItem.storageAreaId) && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 font-normal w-36 justify-start"
                          >
                            <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                            {bulkItem.expirationDate
                              ? format(new Date(bulkItem.expirationDate), 'dd/MM/yyyy', { locale: fr })
                              : t('pages.shopping.expirationDate')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={bulkItem.expirationDate ? new Date(bulkItem.expirationDate) : undefined}
                            onSelect={(date) => updateExpirationDate(index, date ? format(date, 'yyyy-MM-dd') : '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-3 border-t border-border">
          <Button
            variant="outline"
            onClick={() => { onSkipAll(); onOpenChange(false); }}
            className="flex-1"
          >
            {t('pages.shopping.skip')}
          </Button>
          <Button
            variant="green"
            onClick={handleConfirm}
            disabled={selectedCount === 0 || submitting}
            className="flex-1"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <Package className="h-4 w-4 mr-1.5" />
                {t('pages.shopping.storeCount', { count: selectedCount })}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
