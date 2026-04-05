import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Minus, Plus, ChevronDown, ChevronRight, AlertTriangle, Check, Package } from 'lucide-react';
import { useRecipeStore } from '@/stores/recipeStore';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { getItemDisplayName } from '@/utils/itemUtils';
import { Item } from '@/services/itemService';
import {
  ConsumePreviewIngredient,
  ConsumePreviewStoredItem,
  ConsumeDeduction,
  RecipeDto,
} from '@/services/recipeService';

interface ConsumeIngredientsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: RecipeDto;
  initialServings?: number;
}

interface DeductionMap {
  [storedItemId: string]: {
    quantity: number;
    unit: string;
  };
}

export const ConsumeIngredientsDialog = ({
  isOpen,
  onClose,
  recipe,
  initialServings,
}: ConsumeIngredientsDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    consumePreview,
    consumeLoading,
    fetchConsumePreview,
    consumeIngredients,
    clearConsumePreview,
  } = useRecipeStore();

  const [servings, setServings] = useState(recipe.servings);
  const [deductions, setDeductions] = useState<DeductionMap>({});
  const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(new Set());

  const loadPreview = useCallback(
    async (s: number) => {
      try {
        await fetchConsumePreview(recipe.id, s);
      } catch {
        // error is set in store
      }
    },
    [fetchConsumePreview, recipe.id]
  );

  useEffect(() => {
    if (isOpen) {
      const s = initialServings ?? recipe.servings;
      setServings(s);
      setDeductions({});
      setExpandedIngredients(new Set());
      loadPreview(s);
    } else {
      clearConsumePreview();
    }
  }, [isOpen, recipe.servings, initialServings, loadPreview, clearConsumePreview]);

  useEffect(() => {
    if (consumePreview?.ingredients) {
      const initial: DeductionMap = {};
      for (const ing of consumePreview.ingredients) {
        for (const suggestion of ing.suggestedDeductions) {
          initial[suggestion.storedItemId] = {
            quantity: suggestion.quantity,
            unit: suggestion.unit,
          };
        }
      }
      setDeductions(initial);

      const needsExpansion = new Set<string>();
      for (const ing of consumePreview.ingredients) {
        if (ing.availableStoredItems.length > 1 || !ing.hasEnough) {
          needsExpansion.add(ing.recipeIngredientId);
        }
      }
      setExpandedIngredients(needsExpansion);
    }
  }, [consumePreview]);

  const handleServingsChange = (newServings: number) => {
    if (newServings < 1) return;
    setServings(newServings);
    loadPreview(newServings);
  };

  const handleDeductionChange = (
    storedItemId: string,
    quantity: number,
    unit: string,
    maxQuantity: number
  ) => {
    const clamped = Math.max(0, Math.min(quantity, maxQuantity));
    setDeductions((prev) => ({
      ...prev,
      [storedItemId]: { quantity: clamped, unit },
    }));
  };

  const toggleIngredient = (ingredientId: string) => {
    setExpandedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    const finalDeductions: ConsumeDeduction[] = Object.entries(deductions)
      .filter(([, d]) => d.quantity > 0)
      .map(([storedItemId, d]) => ({
        storedItemId,
        quantity: d.quantity,
        unit: d.unit,
      }));

    if (finalDeductions.length === 0) {
      toast({
        title: t('pages.recipes.consume.noDeductions'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await consumeIngredients(recipe.id, finalDeductions);
      const count = result.consumed.length;
      toast({
        title: t('pages.recipes.consume.success'),
        description: t('pages.recipes.consume.successDescription', { count }),
      });
      onClose();
    } catch {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('pages.recipes.consume.failed'),
        variant: 'destructive',
      });
    }
  };

  const hasAnyDeduction = Object.values(deductions).some((d) => d.quantity > 0);

  const getStatusBadge = (ingredient: ConsumePreviewIngredient) => {
    if (!ingredient.canCompare) {
      return (
        <Badge className="text-xs bg-muted text-muted-foreground hover:bg-muted">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {t('pages.recipes.consume.incompatibleUnits')}
        </Badge>
      );
    }
    if (ingredient.availableStoredItems.length === 0) {
      return (
        <Badge className="text-xs bg-red-100 text-red-800 hover:bg-red-100">
          {t('pages.recipes.consume.notInStock')}
        </Badge>
      );
    }
    if (ingredient.hasEnough) {
      return (
        <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
          <Check className="h-3 w-3 mr-1" />
          {t('pages.recipes.consume.sufficient')}
        </Badge>
      );
    }
    return (
      <Badge className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {t('pages.recipes.consume.partial')}
      </Badge>
    );
  };

  const renderStoredItem = (
    si: ConsumePreviewStoredItem,
    ingredient: ConsumePreviewIngredient
  ) => {
    const currentDeduction = deductions[si.storedItemId]?.quantity ?? 0;

    return (
      <div
        key={si.storedItemId}
        className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            {si.storageAreaEmoji && <span>{si.storageAreaEmoji}</span>}
            <span className="font-medium truncate">{si.storageAreaName}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {si.quantity} {si.unit} {t('pages.recipes.consume.available')}
            {si.expirationDate && (
              <span className="ml-2">
                {si.isExpired ? (
                  <span className="text-destructive">{t('pages.recipes.consume.expired')}</span>
                ) : si.isExpiringSoon ? (
                  <span className="text-yellow-600">{t('pages.recipes.consume.expiringSoon')}</span>
                ) : null}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() =>
              handleDeductionChange(
                si.storedItemId,
                currentDeduction - 1,
                si.unit,
                si.quantity
              )
            }
            disabled={currentDeduction <= 0}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            className="w-20 h-7 text-center text-sm"
            value={currentDeduction || ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value) || 0;
              handleDeductionChange(si.storedItemId, val, si.unit, si.quantity);
            }}
            min={0}
            max={si.quantity}
            step="any"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() =>
              handleDeductionChange(
                si.storedItemId,
                currentDeduction + 1,
                si.unit,
                si.quantity
              )
            }
            disabled={currentDeduction >= si.quantity}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground w-8">{si.unit}</span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('pages.recipes.consume.title')}</DialogTitle>
          <DialogDescription>{recipe.title}</DialogDescription>
        </DialogHeader>

        {/* Servings adjuster */}
        <div className="flex items-center justify-between py-3 border-b">
          <span className="text-sm font-medium">
            {t('pages.recipes.consume.servings')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleServingsChange(servings - 1)}
              disabled={servings <= 1 || consumeLoading}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-medium">{servings}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleServingsChange(servings + 1)}
              disabled={consumeLoading}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Ingredient list */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {consumeLoading && !consumePreview ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : consumePreview?.ingredients.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('pages.recipes.consume.noIngredients')}
            </p>
          ) : (
            consumePreview?.ingredients.map((ingredient) => {
              const isExpanded = expandedIngredients.has(
                ingredient.recipeIngredientId
              );
              const itemAsItem = {
                name: ingredient.itemName,
                householdId: null,
              } as Item;

              return (
                <Collapsible
                  key={ingredient.recipeIngredientId}
                  open={isExpanded}
                  onOpenChange={() =>
                    toggleIngredient(ingredient.recipeIngredientId)
                  }
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {getItemDisplayName(itemAsItem, t)}
                          </span>
                          {getStatusBadge(ingredient)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {t('pages.recipes.consume.required')}:{' '}
                          {Math.round(ingredient.requiredQuantity * 100) / 100}{' '}
                          {ingredient.requiredUnit}
                        </div>
                      </div>
                      {ingredient.availableStoredItems.length > 0 && (
                        <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pr-2 pb-2 space-y-2">
                      {ingredient.availableStoredItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic p-2">
                          {t('pages.recipes.consume.notInStock')}
                        </p>
                      ) : (
                        ingredient.availableStoredItems.map((si) =>
                          renderStoredItem(si, ingredient)
                        )
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={consumeLoading}>
            {t('buttons.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasAnyDeduction || consumeLoading}
            variant="default"
          >
            {consumeLoading
              ? t('common.loading')
              : t('pages.recipes.consume.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
