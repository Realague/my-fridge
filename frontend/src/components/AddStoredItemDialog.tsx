import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ItemSelector } from '@/components/ItemSelector';
import { OpenedStatusToggle } from '@/components/OpenedStatusToggle';
import { QuantitySelector } from '@/components/QuantitySelector';
import { SelectedItemPreview } from '@/components/SelectedItemPreview';

import { useStoredItemStore } from '@/stores/storedItemStore';
import { storedItemService } from '@/services/storedItemService';
import type { Item } from '@/services/itemService';
import type { StorageArea } from '@/services/storageAreaService';
import { StorageAreaType, Unit } from '@/types/enums';
import { getItemDisplayName } from '@/utils/itemUtils';
import {
  suggestAreaId,
  type AreaSuggestionMemory,
} from '@/hooks/useStorageAreaSuggestion';

interface AddStoredItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  storageAreas: StorageArea[];
  suggestionMemory: AreaSuggestionMemory;
  onItemAdded: (params: {
    storedItemId: string;
    areaId: string;
    areaName: string;
    category: string | null;
  }) => void;
}

export const AddStoredItemDialog = ({
  open,
  onOpenChange,
  householdId,
  storageAreas,
  suggestionMemory,
  onItemAdded,
}: AddStoredItemDialogProps) => {
  const { t } = useTranslation();
  const addStoredItemToHousehold = useStoredItemStore(
    (state) => state.addStoredItemToHousehold
  );

  const sortedAreas = useMemo(
    () => [...storageAreas].sort((a, b) => a.sortOrder - b.sortOrder),
    [storageAreas]
  );
  const onlyOneArea = sortedAreas.length === 1;

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [storageAreaId, setStorageAreaId] = useState<string>('');
  /** True once the user manually picks an area — disables auto-update on category change. */
  const [areaWasOverridden, setAreaWasOverridden] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [location, setLocation] = useState('');
  const [isOpened, setIsOpened] = useState(false);
  const [openedDate, setOpenedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);

  /**
   * Reset everything on the false→true open transition only — not on every
   * `sortedAreas`/`suggestionMemory` change while the dialog is open, which would
   * wipe the user's in-progress form when another tab refetches data.
   */
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setSelectedItem(null);
      setQuantity('1');
      setUnit('');
      setStorageAreaId(suggestAreaId(null, sortedAreas, suggestionMemory) ?? '');
      setAreaWasOverridden(false);
      setExpirationDate('');
      setLocation('');
      setIsOpened(false);
      setOpenedDate('');
      setSubmitting(false);
      setAreaError(null);
    }
    wasOpenRef.current = open;
  }, [open, sortedAreas, suggestionMemory]);

  /**
   * Re-run the suggestion when the item (i.e. its category) changes — but only if the
   * user hasn't manually picked an area yet. Their explicit choice always wins.
   */
  useEffect(() => {
    if (!open || areaWasOverridden) return;
    const next = suggestAreaId(selectedItem?.category, sortedAreas, suggestionMemory);
    if (next && next !== storageAreaId) {
      setStorageAreaId(next);
    }
    /** suggestionMemory is intentionally excluded — we only react to category changes here. */
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open, selectedItem?.category, sortedAreas, areaWasOverridden]);

  const selectedArea = sortedAreas.find((a) => a.id === storageAreaId) ?? null;
  const showExpirationField = selectedArea?.type !== StorageAreaType.FREEZER;
  /**
   * "Smart" if the resolved area matches the category-driven suggestion. We still surface
   * the badge whenever the user hasn't overridden, even if a single area exists, because
   * the system is still doing the choosing on their behalf.
   */
  const isSuggestionActive =
    !areaWasOverridden && Boolean(selectedItem) && Boolean(selectedArea);

  const handleItemSelect = (item: Item | null) => {
    setSelectedItem(item);
    if (item) {
      setUnit(item.defaultUnit);
      setQuantity('1');
    } else {
      setUnit('');
      setQuantity('1');
    }
  };

  const handleAreaChange = (id: string) => {
    setStorageAreaId(id);
    setAreaWasOverridden(true);
    setAreaError(null);
  };

  const handleQuantityChange = (q: string, u: string) => {
    setQuantity(q);
    setUnit(u);
  };

  const handleSubmit = async () => {
    if (!selectedItem || !storageAreaId || submitting) return;

    const numericQuantity = parseFloat(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      toast.error(t('messages.error.invalidQuantity'));
      return;
    }

    /**
     * Re-validate the area against the freshest list — if another household member has
     * deleted it while the form was open, fail loudly rather than POSTing to a 404.
     */
    const stillExists = sortedAreas.some((a) => a.id === storageAreaId);
    if (!stillExists) {
      setAreaError(t('addStoredItemDialog.areaDeleted'));
      return;
    }

    setSubmitting(true);
    try {
      const created = await storedItemService.createStoredItem(householdId, {
        itemId: selectedItem.id,
        storageAreaId,
        quantity: numericQuantity,
        unit: unit as Unit,
        expirationDate:
          showExpirationField && expirationDate ? expirationDate : undefined,
        location: location.trim() || undefined,
        isOpened,
        openedDate: isOpened && openedDate ? openedDate : undefined,
      });

      addStoredItemToHousehold(created);
      const areaName = selectedArea?.name ?? '';
      onItemAdded({
        storedItemId: created.id,
        areaId: storageAreaId,
        areaName,
        category: selectedItem.category ?? null,
      });
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('messages.error.failedToAddItem');
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('addStoredItemDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('addStoredItemDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t('storageArea.selectItem')}
            </Label>
            <ItemSelector
              onItemSelect={handleItemSelect}
              placeholder={t('forms.searchOrAddItem')}
              selectedItem={selectedItem}
              className="w-full"
            />
          </div>

          {selectedItem && (
            <div className="space-y-4 animate-in fade-in-50 slide-in-from-top-2 duration-300">
              <SelectedItemPreview
                item={selectedItem}
                onClear={() => setSelectedItem(null)}
              />

              {!onlyOneArea && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">
                      {t('addStoredItemDialog.storageAreaLabel')}
                    </Label>
                    {isSuggestionActive && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <Sparkles className="h-3 w-3" aria-hidden />
                        {t('addStoredItemDialog.suggestion')}
                      </span>
                    )}
                  </div>
                  <Select value={storageAreaId} onValueChange={handleAreaChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={t('addStoredItemDialog.storageAreaPlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedAreas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          <span className="flex items-center gap-2">
                            <span aria-hidden>{area.emoji}</span>
                            <span>{area.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {areaError && (
                    <p className="text-xs text-destructive mt-1">{areaError}</p>
                  )}
                </div>
              )}

              {onlyOneArea && selectedArea && (
                <div className="text-xs text-muted-foreground">
                  {t('addStoredItemDialog.singleAreaHint', {
                    name: `${selectedArea.emoji} ${selectedArea.name}`,
                  })}
                </div>
              )}

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {t('storageArea.addItemInformation', {
                    item: getItemDisplayName(selectedItem, t),
                  })}
                </Label>
                <QuantitySelector
                  item={selectedItem}
                  initialQuantity={quantity}
                  initialUnit={unit}
                  onQuantityChange={handleQuantityChange}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {t('storageArea.location')}{' '}
                  <span className="text-muted-foreground">
                    ({t('common.optional')})
                  </span>
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('storageArea.locationPlaceholder')}
                />
              </div>

              {showExpirationField && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {t('storageArea.expirationDate')}{' '}
                    <span className="text-muted-foreground">
                      ({t('common.optional')})
                    </span>
                  </Label>
                  <Input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                </div>
              )}

              {selectedItem.daysAfterOpening && (
                <OpenedStatusToggle
                  isOpened={isOpened}
                  openedDate={openedDate}
                  daysAfterOpening={selectedItem.daysAfterOpening}
                  effectiveExpirationDate={
                    isOpened && openedDate
                      ? new Date(
                          new Date(openedDate).getTime() +
                            selectedItem.daysAfterOpening * 24 * 60 * 60 * 1000
                        )
                          .toISOString()
                          .split('T')[0]
                      : undefined
                  }
                  onToggle={(opened, date) => {
                    setIsOpened(opened);
                    setOpenedDate(date || '');
                  }}
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('buttons.cancel')}
          </Button>
          <Button
            variant="green"
            onClick={handleSubmit}
            disabled={!selectedItem || !storageAreaId || submitting}
          >
            <Plus className="h-4 w-4" />
            {submitting
              ? t('forms.adding')
              : selectedArea
              ? t('storageArea.addTo', { name: selectedArea.name })
              : t('storageArea.addItem')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStoredItemDialog;
