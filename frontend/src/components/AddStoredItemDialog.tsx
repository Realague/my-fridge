import { useEffect, useMemo, useRef, useState } from 'react';
import { ChefHat, Plus, Sparkles, X } from 'lucide-react';
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
import { useRecipeStore } from '@/stores/recipeStore';
import { storedItemService } from '@/services/storedItemService';
import type { Item } from '@/services/itemService';
import type { StorageArea } from '@/services/storageAreaService';
import { ItemCategory, StorageAreaType, Unit } from '@/types/enums';
import { getItemDisplayName } from '@/utils/itemUtils';
import { computeCookedMealExpirationISO } from '@/utils/cookedMealDefaults';
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

type ArticleType = 'ingredient' | 'cooked_meal';

const todayIso = () => new Date().toISOString().split('T')[0];

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
  const recipes = useRecipeStore((state) => state.recipes);
  const fetchRecipes = useRecipeStore((state) => state.fetchRecipes);

  const sortedAreas = useMemo(
    () => [...storageAreas].sort((a, b) => a.sortOrder - b.sortOrder),
    [storageAreas]
  );
  const onlyOneArea = sortedAreas.length === 1;

  const [articleType, setArticleType] = useState<ArticleType>('ingredient');

  // Ingredient flow state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [isOpened, setIsOpened] = useState(false);
  const [openedDate, setOpenedDate] = useState('');

  // Cooked-meal flow state
  const [dishName, setDishName] = useState('');
  const [linkedRecipeId, setLinkedRecipeId] = useState<string | null>(null);
  const [linkRecipe, setLinkRecipe] = useState(true);
  const [cookedDate, setCookedDate] = useState(todayIso());
  const [portions, setPortions] = useState('1');
  const [showRecipeSuggestions, setShowRecipeSuggestions] = useState(false);

  // Shared state
  const [storageAreaId, setStorageAreaId] = useState<string>('');
  const [areaWasOverridden, setAreaWasOverridden] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [expirationWasOverridden, setExpirationWasOverridden] = useState(false);
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setArticleType('ingredient');
      setSelectedItem(null);
      setQuantity('1');
      setUnit('');
      setIsOpened(false);
      setOpenedDate('');
      setDishName('');
      setLinkedRecipeId(null);
      setLinkRecipe(true);
      setCookedDate(todayIso());
      setPortions('1');
      setShowRecipeSuggestions(false);
      setStorageAreaId(suggestAreaId(null, sortedAreas, suggestionMemory) ?? '');
      setAreaWasOverridden(false);
      setExpirationDate('');
      setExpirationWasOverridden(false);
      setLocation('');
      setSubmitting(false);
      setAreaError(null);
      // Pre-load recipes for auto-complete (no-op if already cached)
      void fetchRecipes();
    }
    wasOpenRef.current = open;
  }, [open, sortedAreas, suggestionMemory, fetchRecipes]);

  // Re-suggest area on category change (ingredient flow only)
  useEffect(() => {
    if (!open || areaWasOverridden) return;
    const category =
      articleType === 'cooked_meal' ? ItemCategory.COOKED_MEAL : selectedItem?.category;
    const next = suggestAreaId(category, sortedAreas, suggestionMemory);
    if (next && next !== storageAreaId) {
      setStorageAreaId(next);
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open, articleType, selectedItem?.category, sortedAreas, areaWasOverridden]);

  const selectedArea = sortedAreas.find((a) => a.id === storageAreaId) ?? null;
  const isFreezer = selectedArea?.type === StorageAreaType.FREEZER;
  const showExpirationField = !isFreezer;
  const isSuggestionActive =
    !areaWasOverridden &&
    Boolean(selectedArea) &&
    (articleType === 'cooked_meal' || Boolean(selectedItem));

  // Cooked-meal: auto-pre-fill expiration when storage area or cookedDate changes
  // (only if user hasn't manually edited it).
  useEffect(() => {
    if (articleType !== 'cooked_meal') return;
    if (expirationWasOverridden) return;
    if (!selectedArea || !cookedDate) return;
    const iso = computeCookedMealExpirationISO(selectedArea.type, cookedDate);
    setExpirationDate(iso ?? '');
  }, [articleType, selectedArea?.type, cookedDate, expirationWasOverridden, selectedArea]);

  // Cooked-meal: auto-complete recipe matching
  const recipeMatches = useMemo(() => {
    if (articleType !== 'cooked_meal') return [];
    const q = dishName.trim().toLowerCase();
    if (q.length < 2) return [];
    return recipes
      .filter((r) => r.title.toLowerCase().includes(q))
      .slice(0, 5);
  }, [articleType, dishName, recipes]);

  const linkedRecipe = useMemo(
    () => (linkedRecipeId ? recipes.find((r) => r.id === linkedRecipeId) ?? null : null),
    [linkedRecipeId, recipes]
  );

  const handleArticleTypeChange = (next: ArticleType) => {
    if (next === articleType) return;
    setArticleType(next);
    setAreaWasOverridden(false);
    setExpirationWasOverridden(false);
    if (next === 'cooked_meal') {
      // Reset ingredient fields, keep storage area; expiration will auto-compute.
      setSelectedItem(null);
      setUnit(Unit.SERVING);
      setQuantity('1');
      setIsOpened(false);
      setOpenedDate('');
    } else {
      // Reset cooked-meal fields.
      setDishName('');
      setLinkedRecipeId(null);
      setLinkRecipe(true);
      setExpirationDate('');
    }
  };

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

  const handlePickRecipeSuggestion = (recipeId: string, title: string) => {
    setLinkedRecipeId(recipeId);
    setLinkRecipe(true);
    setDishName(title);
    setShowRecipeSuggestions(false);
  };

  const clearRecipeLink = () => {
    setLinkedRecipeId(null);
    setLinkRecipe(false);
  };

  const handleSubmit = async () => {
    if (!storageAreaId || submitting) return;

    if (articleType === 'ingredient') {
      if (!selectedItem) return;
      const numericQuantity = parseFloat(quantity);
      if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
        toast.error(t('messages.error.invalidQuantity'));
        return;
      }

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
      return;
    }

    // Cooked-meal flow
    const trimmedName = dishName.trim();
    if (!trimmedName) {
      toast.error(t('cookedMeal.dishNameLabel'));
      return;
    }
    const numericPortions = parseFloat(portions);
    if (!Number.isFinite(numericPortions) || numericPortions <= 0) {
      toast.error(t('messages.error.invalidQuantity'));
      return;
    }

    const stillExists = sortedAreas.some((a) => a.id === storageAreaId);
    if (!stillExists) {
      setAreaError(t('addStoredItemDialog.areaDeleted'));
      return;
    }

    setSubmitting(true);
    try {
      const created = await storedItemService.createStoredItem(householdId, {
        articleType: 'cooked_meal',
        name: trimmedName,
        recipeId: linkRecipe && linkedRecipeId ? linkedRecipeId : null,
        cookedDate,
        storageAreaId,
        quantity: numericPortions,
        unit: Unit.SERVING,
        expirationDate:
          showExpirationField && expirationDate ? expirationDate : undefined,
        location: location.trim() || undefined,
      });

      addStoredItemToHousehold(created);
      const areaName = selectedArea?.name ?? '';
      onItemAdded({
        storedItemId: created.id,
        areaId: storageAreaId,
        areaName,
        category: ItemCategory.COOKED_MEAL,
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

  const submitDisabled =
    !storageAreaId ||
    submitting ||
    (articleType === 'ingredient' ? !selectedItem : !dishName.trim());

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
          {/* Article type toggle */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t('cookedMeal.articleType.label')}
            </Label>
            <div
              role="tablist"
              aria-label={t('cookedMeal.articleType.label')}
              className="inline-flex rounded-full bg-muted p-1 gap-1"
            >
              {(['ingredient', 'cooked_meal'] as const).map((type) => {
                const active = articleType === type;
                return (
                  <button
                    key={type}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => handleArticleTypeChange(type)}
                    className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {type === 'ingredient'
                      ? t('cookedMeal.articleType.ingredient')
                      : t('cookedMeal.articleType.cookedMeal')}
                  </button>
                );
              })}
            </div>
          </div>

          {articleType === 'ingredient' && (
            <>
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
                </div>
              )}
            </>
          )}

          {articleType === 'cooked_meal' && (
            <div className="space-y-4 animate-in fade-in-50 slide-in-from-top-2 duration-300">
              <div className="relative">
                <Label className="text-sm font-medium mb-2 block">
                  {t('cookedMeal.dishNameLabel')}
                </Label>
                <Input
                  value={dishName}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDishName(next);
                    setShowRecipeSuggestions(true);
                    if (linkedRecipe && linkedRecipe.title !== next) {
                      // Editing the name away from the linked recipe → drop the link.
                      setLinkedRecipeId(null);
                    }
                  }}
                  onFocus={() => setShowRecipeSuggestions(true)}
                  onBlur={() => {
                    // Defer hiding so a click on a suggestion fires first.
                    setTimeout(() => setShowRecipeSuggestions(false), 150);
                  }}
                  placeholder={t('cookedMeal.dishNamePlaceholder')}
                />
                {showRecipeSuggestions && recipeMatches.length > 0 && (
                  <ul
                    className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md text-sm max-h-56 overflow-y-auto"
                    role="listbox"
                  >
                    {recipeMatches.map((r) => (
                      <li
                        key={r.id}
                        role="option"
                        aria-selected={linkedRecipeId === r.id}
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handlePickRecipeSuggestion(r.id, r.title)}
                          className="w-full text-left px-3 py-2 hover:bg-accent flex items-center gap-2"
                        >
                          <ChefHat className="h-4 w-4 text-muted-foreground" aria-hidden />
                          <span>{r.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {linkedRecipe && linkRecipe && (
                <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <ChefHat className="h-4 w-4" aria-hidden />
                    {t('cookedMeal.linkRecipeLabel', { title: linkedRecipe.title })}
                  </span>
                  <button
                    type="button"
                    onClick={clearRecipeLink}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={t('buttons.cancel')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {t('cookedMeal.cookingDateLabel')}
                  </Label>
                  <Input
                    type="date"
                    value={cookedDate}
                    onChange={(e) => setCookedDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {t('cookedMeal.portionsLabel')}
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={portions}
                    onChange={(e) => setPortions(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {(articleType === 'cooked_meal' || selectedItem) && (
            <>
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

              {articleType === 'ingredient' && selectedItem && (
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
              )}

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
                    onChange={(e) => {
                      setExpirationDate(e.target.value);
                      setExpirationWasOverridden(true);
                    }}
                  />
                </div>
              )}

              {articleType === 'ingredient' &&
                selectedItem?.daysAfterOpening && (
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
            </>
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
            disabled={submitDisabled}
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
