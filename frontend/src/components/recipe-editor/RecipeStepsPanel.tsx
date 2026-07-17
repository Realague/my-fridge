import React from 'react';
import { Carrot, Check, Clock, ListOrdered, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RecipeStep } from '@/services/recipeService';
import { getItemDisplayName } from '@/utils/itemUtils';
import { formatQuantityWithUnit } from '@/utils/unitSystem';
import { cn } from '@/lib/utils';
import { EditorIngredient } from './types';

interface RecipeStepsPanelProps {
  instructions: RecipeStep[];
  ingredients: EditorIngredient[];
  ingredientStepMap: Record<string, number[]>;
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onTextChange: (index: number, text: string) => void;
  onDurationChange: (index: number, minutes: number | null) => void;
  onToggleIngredient: (ingredientId: string, stepIndex: number) => void;
}

const autoResize = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

/**
 * "Préparation" panel: vertical timeline of editable steps, each with an
 * optional duration chip and an ingredient picker that links ingredients
 * from the left panel to the step (green chips).
 */
export const RecipeStepsPanel = ({
  instructions,
  ingredients,
  ingredientStepMap,
  onAddStep,
  onRemoveStep,
  onTextChange,
  onDurationChange,
  onToggleIngredient,
}: RecipeStepsPanelProps) => {
  const { t } = useTranslation();

  const namedIngredients = ingredients.filter((ing) => ing.itemId);

  const ingredientChipLabel = (ingredient: EditorIngredient) => {
    const itemName = getItemDisplayName(ingredient.item, t);
    const quantityLabel = formatQuantityWithUnit(ingredient.quantity, ingredient.unit, t, {
      item: ingredient.item,
      itemName,
      isFreeQuantity: ingredient.isFreeQuantity,
    });
    return { itemName, quantityLabel };
  };

  return (
    <div className="rounded-[22px] bg-card p-5 shadow-[var(--mf-shadow-2)] sm:p-6">
      {/* Panel header */}
      <div className="flex items-center gap-3">
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-mf-orange-soft">
          <ListOrdered className="h-[18px] w-[18px] text-mf-orange" />
        </span>
        <h3 className="font-display text-xl font-bold tracking-tight">
          {t('pages.recipes.editor.stepsTitle')}
        </h3>
        <span className="ml-auto font-display text-[13px] font-bold text-mf-text-mute">
          {t('pages.recipes.editor.stepCount', { count: instructions.length })}
        </span>
      </div>
      <p className="mb-3.5 ml-[46px] text-[13px] text-mf-text-soft">
        {t('pages.recipes.editor.stepsSubtitle')}
      </p>

      {/* Timeline */}
      <div className="relative">
        {instructions.length > 0 && (
          <div className="absolute bottom-14 left-[17px] top-3.5 w-0.5 bg-mf-night-line" aria-hidden="true" />
        )}

        {instructions.map((instruction, index) => {
          const linkedIngredients = namedIngredients.filter((ing) =>
            (ingredientStepMap[ing.id] || []).includes(index)
          );
          return (
            <div key={index} className="relative grid grid-cols-[36px_1fr] gap-4 pb-4">
              <div className="z-[1] flex h-9 w-9 items-center justify-center rounded-full bg-mf-green font-display text-[15px] font-extrabold text-white ring-[5px] ring-card">
                {index + 1}
              </div>
              <div className="rounded-2xl bg-muted p-4 transition-shadow focus-within:ring-2 focus-within:ring-inset focus-within:ring-mf-green">
                <textarea
                  rows={1}
                  ref={autoResize}
                  value={instruction.text}
                  onChange={(e) => {
                    onTextChange(index, e.target.value);
                    autoResize(e.target);
                  }}
                  placeholder={t('pages.recipes.editor.stepPlaceholder')}
                  className="min-h-[24px] w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-sm leading-relaxed text-foreground outline-none placeholder:text-mf-text-mute"
                />

                {/* Linked ingredients + picker */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {linkedIngredients.map((ingredient) => {
                    const { itemName, quantityLabel } = ingredientChipLabel(ingredient);
                    return (
                      <span
                        key={ingredient.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-mf-green-soft py-1 pl-2.5 pr-1.5 font-display text-xs font-bold text-mf-green-deep"
                      >
                        {itemName}
                        {quantityLabel && (
                          <span className="font-semibold opacity-65">{quantityLabel}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => onToggleIngredient(ingredient.id, index)}
                          aria-label={t('messages.action.delete')}
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-mf-green-deep/20 hover:bg-mf-green-deep/35"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    );
                  })}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-mf-night-line px-2.5 py-1 font-display text-xs font-bold text-mf-text-soft transition-colors hover:border-solid hover:border-mf-green hover:bg-mf-green-soft hover:text-mf-green-deep"
                      >
                        <Carrot className="h-3.5 w-3.5" />
                        {t('pages.recipes.editor.stepIngredients')}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      sideOffset={6}
                      className="max-h-60 w-72 overflow-y-auto rounded-md border-mf-night-line p-1.5 shadow-[var(--mf-shadow-3)]"
                    >
                      {namedIngredients.length === 0 ? (
                        <div className="px-3 py-3 text-center text-xs text-mf-text-mute">
                          {t('pages.recipes.editor.stepIngredientsEmpty')}
                        </div>
                      ) : (
                        namedIngredients.map((ingredient) => {
                          const isLinked = (ingredientStepMap[ingredient.id] || []).includes(index);
                          const { itemName, quantityLabel } = ingredientChipLabel(ingredient);
                          return (
                            <button
                              key={ingredient.id}
                              type="button"
                              onClick={() => onToggleIngredient(ingredient.id, index)}
                              className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
                            >
                              <span
                                className={cn(
                                  'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2 text-white transition-colors',
                                  isLinked
                                    ? 'border-mf-green bg-mf-green'
                                    : 'border-mf-night-line bg-transparent'
                                )}
                              >
                                {isLinked && <Check className="h-3 w-3" />}
                              </span>
                              <span className="truncate">{itemName}</span>
                              {quantityLabel && (
                                <span className="ml-auto shrink-0 font-display text-xs font-bold text-mf-text-mute">
                                  {quantityLabel}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Duration + delete */}
                <div className="mt-2.5 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-display text-xs font-bold text-mf-text-soft">
                    <Clock className="h-3.5 w-3.5 text-mf-orange" />
                    <input
                      type="number"
                      min="0"
                      placeholder="–"
                      value={instruction.duration != null ? instruction.duration / 60 : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onDurationChange(index, val === '' ? null : parseFloat(val) || 0);
                      }}
                      aria-label={t('pages.recipes.durationPlaceholder')}
                      className="w-10 border-0 bg-transparent p-0 text-right font-display text-xs font-extrabold text-foreground outline-none placeholder:text-mf-text-mute [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    {t('pages.recipes.editor.minutesUnit')}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveStep(index)}
                    aria-label={t('messages.action.delete')}
                    className="ml-auto rounded-lg p-1.5 text-mf-text-mute transition-colors hover:bg-mf-red-soft hover:text-mf-red"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add step */}
        <button
          type="button"
          onClick={onAddStep}
          className="group grid w-full grid-cols-[36px_1fr] items-center gap-4 text-left"
        >
          <span className="z-[1] flex h-9 w-9 items-center justify-center rounded-full bg-mf-green-soft text-mf-green-deep ring-[5px] ring-card transition-colors group-hover:bg-mf-green group-hover:text-white">
            <Plus className="h-[18px] w-[18px]" />
          </span>
          <span className="font-display text-sm font-bold text-mf-green-deep">
            {t('pages.recipes.editor.addStep')}
          </span>
        </button>
      </div>
    </div>
  );
};
