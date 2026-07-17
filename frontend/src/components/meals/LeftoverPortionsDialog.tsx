import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
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

import { useStoredItemStore } from '@/stores/storedItemStore';
import { useStorageAreaStore } from '@/stores/storageAreaStore';
import { storedItemService } from '@/services/storedItemService';
import { ItemCategory, StorageAreaType, Unit } from '@/types/enums';
import { StorageAreaIcon } from '@/utils/storageAreaIcons';
import { computeCookedMealExpirationISO } from '@/utils/cookedMealDefaults';
import {
  suggestAreaId,
  type AreaSuggestionMemory,
} from '@/hooks/useStorageAreaSuggestion';

const todayIso = () => new Date().toISOString().split('T')[0];

export interface LeftoverPortionsResult {
  outcome: 'saved' | 'skipped';
  portions?: number;
  areaId?: string;
  areaName?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  recipe: {
    id: string;
    title: string;
    servings: number;
  };
  /** Number to pre-fill in the stepper (defaults to recipe.servings). */
  defaultPortions?: number;
  suggestionMemory: AreaSuggestionMemory;
  /**
   * Fires after the user confirms or skips. Parent uses this to mark the
   * source meal as cooked, show the toast, etc. For 'saved', a stored item
   * has been created server-side already.
   */
  onComplete: (result: LeftoverPortionsResult) => void;
}

export const LeftoverPortionsDialog = ({
  open,
  onOpenChange,
  householdId,
  recipe,
  defaultPortions,
  suggestionMemory,
  onComplete,
}: Props) => {
  const { t } = useTranslation();
  const addStoredItemToHousehold = useStoredItemStore(
    (state) => state.addStoredItemToHousehold
  );
  const storageAreas = useStorageAreaStore((state) => state.getStorageAreasForHousehold());

  const sortedAreas = useMemo(
    () => [...storageAreas].sort((a, b) => a.sortOrder - b.sortOrder),
    [storageAreas]
  );

  const initialPortions = Math.max(0, defaultPortions ?? recipe.servings ?? 0);

  const [portions, setPortions] = useState(initialPortions);
  const [storageAreaId, setStorageAreaId] = useState<string>('');
  const [areaWasOverridden, setAreaWasOverridden] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [expirationWasOverridden, setExpirationWasOverridden] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset on open.
  useEffect(() => {
    if (!open) return;
    setPortions(initialPortions);
    const suggested = suggestAreaId(ItemCategory.COOKED_MEAL, sortedAreas, suggestionMemory);
    setStorageAreaId(suggested ?? '');
    setAreaWasOverridden(false);
    setExpirationWasOverridden(false);
    setSubmitting(false);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open]);

  const selectedArea = sortedAreas.find((a) => a.id === storageAreaId) ?? null;
  const isFreezer = selectedArea?.type === StorageAreaType.FREEZER;
  const showExpirationField = !isFreezer;

  // Auto-pre-fill expiration when area changes (unless user edited it).
  useEffect(() => {
    if (!open) return;
    if (expirationWasOverridden) return;
    if (!selectedArea) {
      setExpirationDate('');
      return;
    }
    const iso = computeCookedMealExpirationISO(selectedArea.type, todayIso());
    setExpirationDate(iso ?? '');
  }, [open, selectedArea, expirationWasOverridden]);

  const handleAreaChange = (id: string) => {
    setStorageAreaId(id);
    setAreaWasOverridden(true);
    // Re-trigger expiration auto-fill on next render unless user already edited it.
    if (!expirationWasOverridden) {
      const next = sortedAreas.find((a) => a.id === id);
      const iso = next ? computeCookedMealExpirationISO(next.type, todayIso()) : null;
      setExpirationDate(iso ?? '');
    }
  };

  const handleSkip = () => {
    if (submitting) return;
    onComplete({ outcome: 'skipped' });
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (portions <= 0 || !storageAreaId) {
      // 0 portions = skip (per spec).
      handleSkip();
      return;
    }

    const stillExists = sortedAreas.some((a) => a.id === storageAreaId);
    if (!stillExists) {
      toast.error(t('addStoredItemDialog.areaDeleted'));
      return;
    }

    setSubmitting(true);
    try {
      const created = await storedItemService.createStoredItem(householdId, {
        articleType: 'cooked_meal',
        name: recipe.title,
        recipeId: recipe.id,
        cookedDate: todayIso(),
        storageAreaId,
        quantity: portions,
        unit: Unit.SERVING,
        expirationDate:
          showExpirationField && expirationDate ? expirationDate : undefined,
      });
      addStoredItemToHousehold(created);

      onComplete({
        outcome: 'saved',
        portions,
        areaId: storageAreaId,
        areaName: selectedArea?.name ?? '',
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

  const onlyOneArea = sortedAreas.length === 1;
  const isSuggestionActive = !areaWasOverridden && Boolean(selectedArea);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) {
          // Closing via X / overlay = skip per spec.
          onComplete({ outcome: 'skipped' });
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: 'var(--mf-night-surface)',
          border: '1px solid var(--mf-night-line)',
          borderRadius: 'var(--mf-radius-xl)',
          color: 'var(--mf-text)',
          fontFamily: 'var(--mf-font-body)',
        }}
      >
        <DialogHeader>
          <div className="mf-eyebrow mb-1">
            {t('leftoverPortionsDialog.kicker')}
          </div>
          <DialogTitle className="mf-display text-[24px] leading-tight text-[color:var(--mf-text)]">
            {t('leftoverPortionsDialog.title')}
          </DialogTitle>
          <p className="mt-1 text-[13px] text-[color:var(--mf-text-soft)]">
            {recipe.title}
          </p>
          {recipe.servings > 0 && (
            <p className="mt-0.5 text-[12px] text-[color:var(--mf-text-mute)]">
              {t('leftoverPortionsDialog.recipeServings', { count: recipe.servings })}
            </p>
          )}
        </DialogHeader>

        {/* Portions stepper */}
        <div className="flex items-center justify-center gap-5 py-3">
          <button
            type="button"
            onClick={() => setPortions((p) => Math.max(0, p - 1))}
            disabled={submitting || portions <= 0}
            className="mf-stepper-btn h-11 w-11"
            aria-label={t('leftoverPortionsDialog.decrement')}
          >
            <Minus className="h-5 w-5" strokeWidth={2} />
          </button>
          <span className="mf-display tabular-nums min-w-[3rem] text-center text-[44px] leading-none text-[color:var(--mf-green)]">
            {portions}
          </span>
          <button
            type="button"
            onClick={() => setPortions((p) => Math.min(100, p + 1))}
            disabled={submitting || portions >= 100}
            className="mf-stepper-btn h-11 w-11"
            aria-label={t('leftoverPortionsDialog.increment')}
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <p className="mb-3 text-center text-[12px] text-[color:var(--mf-text-mute)]">
          {portions > 0
            ? t('leftoverPortionsDialog.portionsHelper', { count: portions })
            : t('leftoverPortionsDialog.portionsHelperZero')}
        </p>

        {portions > 0 && (
          <div className="space-y-3">
            {!onlyOneArea && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-[13px] font-medium text-[color:var(--mf-text)]">
                    {t('leftoverPortionsDialog.storageAreaLabel')}
                  </Label>
                  {isSuggestionActive && (
                    <span className="inline-flex items-center gap-1 text-xs text-[color:var(--mf-green-text)]">
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
                          <StorageAreaIcon type={area.type} className="h-4 w-4" />
                          <span>{area.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {onlyOneArea && selectedArea && (
              <div className="text-xs text-[color:var(--mf-text-mute)]">
                {t('addStoredItemDialog.singleAreaHint', {
                  name: selectedArea.name,
                })}
              </div>
            )}

            {showExpirationField && (
              <div>
                <Label className="text-[13px] font-medium text-[color:var(--mf-text)] mb-1.5 block">
                  {t('leftoverPortionsDialog.expirationLabel')}
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
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting}
            className="mf-btn mf-btn-ghost"
          >
            {t('leftoverPortionsDialog.skip')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || portions <= 0 || !storageAreaId}
            className="mf-btn mf-btn-primary"
          >
            {submitting
              ? t('common.loading')
              : t('leftoverPortionsDialog.save')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeftoverPortionsDialog;
