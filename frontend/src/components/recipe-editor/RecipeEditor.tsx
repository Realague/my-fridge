import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Info,
  RotateCcw,
  UtensilsCrossed,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CreateRecipeIngredientDto,
  RecipeDifficulty,
  RecipeStep,
} from '@/services/recipeService';
import { useRecipeStore } from '@/stores/recipeStore';
import { useToast } from '@/hooks/use-toast';
import { StructuredIngredientInput } from '@/components/StructuredIngredientInput';
import { cn } from '@/lib/utils';
import { RecipePhotoTile } from './RecipePhotoTile';
import { RecipeMetaBubbles } from './RecipeMetaBubbles';
import { RecipeStepsPanel } from './RecipeStepsPanel';
import { RecipeTagsPanel, SUGGESTED_TAG_KEYS, TagSuggestion } from './RecipeTagsPanel';
import { EditorIngredient, emptyIngredient, newIngredientId } from './types';

export interface RecipeEditorInitialValues {
  title?: string;
  description?: string;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  difficulty?: RecipeDifficulty;
  ingredients?: EditorIngredient[];
  instructions?: RecipeStep[];
  tags?: string[];
  ingredientStepMap?: Record<string, number[]>;
  imageUrl?: string | null;
}

export interface RecipeEditorSubmitData {
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  instructions: RecipeStep[];
  tags: string[];
  ingredients: CreateRecipeIngredientDto[];
  imageUrl: string | null;
  imageFile: File | null;
}

interface RecipeEditorProps {
  mode: 'create' | 'edit';
  /** Bold part of the breadcrumb ("Nouvelle recette" or the recipe title). */
  breadcrumb: string;
  initialValues?: RecipeEditorInitialValues;
  saving?: boolean;
  /** Create mode: keep the file locally and upload after the recipe exists. */
  deferImageUpload?: boolean;
  /** Raw ingredient lines from an import (Marmiton), shown as a reference card. */
  importedIngredients?: string[];
  onSubmit: (data: RecipeEditorSubmitData) => void | Promise<void>;
  onBack: () => void;
  /** Edit mode: cancel button of the sticky action bar. */
  onCancel?: () => void;
}

const autoResize = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

const seedIngredients = () => [emptyIngredient(), emptyIngredient()];
const seedInstructions = (): RecipeStep[] => [{ text: '', duration: null }];

/**
 * Recipe creation / edition "studio" following the Fresh redesign
 * (docs/design_creation_de_recette): photo + inline title header, colored
 * meta bubbles, ingredients / steps two-column body, tags panel and a
 * sticky action bar whose primary button unlocks once the recipe has a
 * title, one ingredient and one step.
 */
export const RecipeEditor = ({
  mode,
  breadcrumb,
  initialValues,
  saving = false,
  deferImageUpload = false,
  importedIngredients = [],
  onSubmit,
  onBack,
  onCancel,
}: RecipeEditorProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { tags: householdTags, fetchTags } = useRecipeStore();

  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [prepTime, setPrepTime] = useState(
    initialValues?.prepTime != null ? String(initialValues.prepTime) : ''
  );
  const [cookTime, setCookTime] = useState(
    initialValues?.cookTime != null ? String(initialValues.cookTime) : ''
  );
  const [servings, setServings] = useState(
    initialValues?.servings != null ? String(initialValues.servings) : ''
  );
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>(
    initialValues?.difficulty ?? 'Easy'
  );
  const [ingredients, setIngredients] = useState<EditorIngredient[]>(
    initialValues?.ingredients?.length ? initialValues.ingredients : seedIngredients()
  );
  const [instructions, setInstructions] = useState<RecipeStep[]>(
    initialValues?.instructions?.length ? initialValues.instructions : seedInstructions()
  );
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [ingredientStepMap, setIngredientStepMap] = useState<Record<string, number[]>>(
    initialValues?.ingredientStepMap ?? {}
  );
  const [imageUrl, setImageUrl] = useState<string | null>(initialValues?.imageUrl ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Household tags feed the suggestion pills; a missing household is fine.
  useEffect(() => {
    fetchTags().catch(() => {});
  }, [fetchTags]);

  const tagSuggestions = useMemo<TagSuggestion[]>(() => {
    const defaults: TagSuggestion[] = SUGGESTED_TAG_KEYS.map((key) => ({
      key,
      label: t(`pages.recipes.editor.suggestedTags.${key}`),
    }));
    const known = new Set(defaults.map((s) => s.label.toLowerCase()));
    const fromHousehold = (householdTags || [])
      .filter((tag) => !known.has(tag.toLowerCase()))
      .slice(0, 8)
      .map((tag) => ({ key: `household-${tag}`, label: tag }));
    return [...defaults, ...fromHousehold];
  }, [householdTags, t]);

  // ── Ingredients ────────────────────────────────────────────────────────
  const handleIngredientsChange = (updated: EditorIngredient[]) => {
    const withIds = updated.map((ingredient) => ({
      ...ingredient,
      id: ingredient.id || newIngredientId(),
    }));
    setIngredients(withIds);

    // Drop step mappings of removed ingredients.
    const currentIds = new Set(withIds.map((ing) => ing.id));
    setIngredientStepMap((map) => {
      const next = { ...map };
      Object.keys(next).forEach((id) => {
        if (!currentIds.has(id)) delete next[id];
      });
      return next;
    });
  };

  // ── Steps ──────────────────────────────────────────────────────────────
  const addStep = () => setInstructions((list) => [...list, { text: '', duration: null }]);

  const removeStep = (index: number) => {
    setInstructions((list) => list.filter((_, i) => i !== index));
    setIngredientStepMap((map) => {
      const next: Record<string, number[]> = {};
      Object.entries(map).forEach(([id, steps]) => {
        next[id] = steps
          .filter((stepIndex) => stepIndex !== index)
          .map((stepIndex) => (stepIndex > index ? stepIndex - 1 : stepIndex));
      });
      return next;
    });
  };

  const updateStepText = (index: number, text: string) =>
    setInstructions((list) => list.map((step, i) => (i === index ? { ...step, text } : step)));

  const updateStepDuration = (index: number, minutes: number | null) =>
    setInstructions((list) =>
      list.map((step, i) =>
        i === index ? { ...step, duration: minutes != null ? minutes * 60 : null } : step
      )
    );

  const toggleIngredientForStep = (ingredientId: string, stepIndex: number) => {
    setIngredientStepMap((map) => {
      const current = map[ingredientId] || [];
      const linked = current.includes(stepIndex);
      return {
        ...map,
        [ingredientId]: linked
          ? current.filter((s) => s !== stepIndex)
          : [...current, stepIndex].sort((a, b) => a - b),
      };
    });
  };

  // ── Tags ───────────────────────────────────────────────────────────────
  const addTag = (tag: string) => {
    setTags((list) =>
      list.some((existing) => existing.toLowerCase() === tag.toLowerCase())
        ? list
        : [...list, tag]
    );
  };
  const removeTag = (tag: string) => setTags((list) => list.filter((x) => x !== tag));

  // ── Validity ───────────────────────────────────────────────────────────
  const validIngredients = ingredients.filter(
    (ing) => ing.itemId && (ing.isFreeQuantity || (ing.quantity != null && ing.quantity > 0))
  );
  const hasTitle = title.trim().length > 0;
  const hasIngredient = validIngredients.length > 0;
  const hasStep = instructions.some((step) => step.text.trim() !== '');
  const isValid = hasTitle && hasIngredient && hasStep;

  const missingParts = [
    !hasTitle && t('pages.recipes.editor.missingTitle'),
    !hasIngredient && t('pages.recipes.editor.missingIngredient'),
    !hasStep && t('pages.recipes.editor.missingStep'),
  ].filter(Boolean) as string[];

  // ── Reset (create mode) ────────────────────────────────────────────────
  const handleClear = () => {
    setTitle('');
    setDescription('');
    setPrepTime('');
    setCookTime('');
    setServings('');
    setDifficulty('Easy');
    setIngredients(seedIngredients());
    setInstructions(seedInstructions());
    setTags([]);
    setIngredientStepMap({});
    setImageUrl(null);
    setImageFile(null);
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isValid || saving) return;

    const itemIds = validIngredients.map((ing) => ing.itemId);
    if (new Set(itemIds).size !== itemIds.length) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.duplicateIngredients'),
        variant: 'destructive',
      });
      return;
    }

    const ingredientsForApi: CreateRecipeIngredientDto[] = validIngredients.map((ingredient) => ({
      itemId: ingredient.itemId,
      quantity: ingredient.isFreeQuantity ? null : ingredient.quantity,
      unit: ingredient.unit,
      isFreeQuantity: Boolean(ingredient.isFreeQuantity),
      notes: ingredient.notes,
      usedInSteps: ingredientStepMap[ingredient.id] || [],
    }));

    await onSubmit({
      title: title.trim(),
      description,
      prepTime: parseInt(prepTime, 10) || 0,
      cookTime: parseInt(cookTime, 10) || 0,
      servings: Math.max(1, parseInt(servings, 10) || 4),
      difficulty,
      instructions: instructions.filter((step) => step.text.trim() !== ''),
      tags,
      ingredients: ingredientsForApi,
      imageUrl,
      imageFile,
    });
  };

  const eyebrowLabel =
    mode === 'create'
      ? t('pages.recipes.editor.newRecipe')
      : t('pages.recipes.editRecipeTitle');

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[1180px] flex-col px-4 pt-4 sm:px-6 sm:pt-6">
        {/* Top bar */}
        <div className="mb-5 flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('buttons.back')}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md bg-card text-mf-text-soft shadow-[var(--mf-shadow-1)] transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-[19px] w-[19px]" />
          </button>
          <div className="min-w-0 font-display text-sm font-semibold text-mf-text-mute">
            {t('pages.recipes.title')}
            <span className="mx-1.5">/</span>
            <b className="font-bold text-foreground">{breadcrumb}</b>
          </div>
        </div>

        {/* Header: photo tile + inline title/description */}
        <div className="mb-5 grid gap-6 md:grid-cols-[340px_1fr]">
          <RecipePhotoTile
            imageUrl={imageUrl}
            deferUpload={deferImageUpload}
            onImageSelected={(file, previewUrl) => {
              setImageFile(file);
              setImageUrl(previewUrl);
            }}
            onImageUploaded={(url) => setImageUrl(url)}
            onImageRemove={() => {
              setImageUrl(null);
              setImageFile(null);
            }}
          />
          <div className="flex flex-col justify-center py-1">
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-mf-green-soft px-2.5 py-1 font-display text-[11.5px] font-bold uppercase tracking-[0.16em] text-mf-green-deep">
              <UtensilsCrossed className="h-3 w-3" />
              {eyebrowLabel}
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('pages.recipes.editor.titlePlaceholder')}
              autoComplete="off"
              aria-label={t('pages.recipes.recipeTitle')}
              className="mt-3.5 w-full border-0 bg-transparent p-0 font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground outline-none placeholder:text-mf-text-mute/60 sm:text-[40px]"
            />
            <textarea
              rows={1}
              ref={autoResize}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                autoResize(e.target);
              }}
              placeholder={t('pages.recipes.editor.descriptionPlaceholder')}
              aria-label={t('pages.recipes.description')}
              className="mt-3 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[15.5px] leading-normal text-mf-text-soft outline-none placeholder:text-mf-text-mute"
            />
            <div className="mt-4 h-px bg-mf-night-line" />
            <div className="mt-3.5 flex items-center gap-2 text-[12.5px] text-mf-text-mute">
              <Info className="h-[15px] w-[15px] shrink-0" />
              {t('pages.recipes.editor.helper')}
            </div>
          </div>
        </div>

        {/* Meta bubbles */}
        <div className="mb-5">
          <RecipeMetaBubbles
            prepTime={prepTime}
            cookTime={cookTime}
            servings={servings}
            difficulty={difficulty}
            onPrepTimeChange={setPrepTime}
            onCookTimeChange={setCookTime}
            onServingsChange={setServings}
            onDifficultyChange={setDifficulty}
          />
        </div>

        {/* Imported ingredients reference (Marmiton import) */}
        {importedIngredients.length > 0 && (
          <Card className="mb-5 border-mf-warning/30 bg-mf-warning-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-mf-warning">
                {t('pages.importRecipe.importedIngredients')}
              </CardTitle>
              <CardDescription className="text-mf-warning">
                {t('pages.importRecipe.importedIngredientsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-mf-warning">
                {importedIngredients.map((ing, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Body: ingredients | steps */}
        <div className="grid items-start gap-5 lg:grid-cols-[380px_1fr]">
          <StructuredIngredientInput
            ingredients={ingredients}
            onIngredientsChange={(updated) =>
              handleIngredientsChange(updated as EditorIngredient[])
            }
          />
          <RecipeStepsPanel
            instructions={instructions}
            ingredients={ingredients}
            ingredientStepMap={ingredientStepMap}
            onAddStep={addStep}
            onRemoveStep={removeStep}
            onTextChange={updateStepText}
            onDurationChange={updateStepDuration}
            onToggleIngredient={toggleIngredientForStep}
          />
        </div>

        {/* Tags */}
        <div className="mt-5">
          <RecipeTagsPanel
            tags={tags}
            suggestions={tagSuggestions}
            onAddTag={addTag}
            onRemoveTag={removeTag}
          />
        </div>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 z-30 mt-6 -mx-4 flex flex-wrap items-center gap-3 border-t border-mf-night-line bg-background/85 px-4 py-3.5 backdrop-blur-md sm:-mx-6 sm:px-6">
          <span
            className={cn(
              'flex items-center gap-2 text-[12.5px]',
              isValid ? 'text-mf-green-deep' : 'text-mf-text-soft'
            )}
          >
            {isValid ? (
              <>
                <CheckCircle2 className="h-[15px] w-[15px] shrink-0 text-mf-green" />
                {mode === 'create'
                  ? t('pages.recipes.editor.readyToPublish')
                  : t('pages.recipes.editor.readyToSave')}
              </>
            ) : (
              <>
                <Info className="h-[15px] w-[15px] shrink-0 text-mf-text-mute" />
                {t('pages.recipes.editor.missingHint', { parts: missingParts.join(', ') })}
              </>
            )}
          </span>
          <div className="ml-auto flex items-center gap-2.5">
            {mode === 'create' ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-card px-5 py-3 font-display text-sm font-bold text-foreground shadow-[var(--mf-shadow-1)] transition-colors hover:bg-muted"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('pages.recipes.editor.clear')}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('pages.recipes.editor.clearConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('pages.recipes.editor.clearConfirmDescription')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClear}>
                      {t('pages.recipes.editor.clear')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-2 rounded-full bg-card px-5 py-3 font-display text-sm font-bold text-foreground shadow-[var(--mf-shadow-1)] transition-colors hover:bg-muted"
              >
                {t('buttons.cancel')}
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || saving}
              className="inline-flex items-center gap-2 rounded-full bg-mf-green px-5 py-3 font-display text-sm font-bold text-white shadow-[0_6px_16px_rgba(43,182,115,.32)] transition-all hover:bg-mf-green-deep disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
            >
              <Check className="h-4 w-4" />
              {saving
                ? t('pages.recipes.saving')
                : mode === 'create'
                  ? t('pages.recipes.editor.publish')
                  : t('pages.recipes.saveRecipe')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
