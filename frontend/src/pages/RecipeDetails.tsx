import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Calendar,
  Carrot,
  Check,
  ChefHat,
  Clock,
  ExternalLink,
  Flame,
  Gauge,
  Heart,
  ListOrdered,
  Minus,
  PenLine,
  Plus,
  ShoppingCart,
  Timer,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { ConfirmServingsDialog } from '@/components/meals/ConfirmServingsDialog';
import { ConsumeIngredientsDialog } from '@/components/ConsumeIngredientsDialog';
import { useRecipeStore, type RecipeDeletionImpact } from '@/stores/recipeStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useShoppingStore } from '@/stores/shoppingStore';
import { useMealStore } from '@/stores/mealStore';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { getItemDisplayName } from '@/utils/itemUtils';
import { formatQuantityWithUnit, isFreeQuantityUnit } from '@/utils/unitSystem';
import { Item } from '@/services/itemService';
import { useAuthStore } from '@/stores/authStore';
import { iconForTagLabel } from '@/components/recipe-editor/RecipeTagsPanel';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DIFFICULTY_DOTS: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };

const RecipeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const {
    currentRecipe: recipe,
    loading,
    error,
    fetchRecipeById,
    toggleFavorite,
    deleteRecipe,
    getRecipeDeletionImpact,
    clearCurrentRecipe,
    clearError
  } = useRecipeStore();
  const removeStoredItemsByItemId = useStoredItemStore((s) => s.removeStoredItemsByItemId);
  const createShoppingItem = useShoppingStore((s) => s.createShoppingItem);
  const currentUser = useAuthStore((state) => state.user);

  const [showAddToMealsDialog, setShowAddToMealsDialog] = useState(false);
  const [showConsumeDialog, setShowConsumeDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState<RecipeDeletionImpact | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState(false);
  const { addMeal, saving: addingMeal } = useMealStore();

  // Reader interactions from the Fresh redesign: live servings scaler,
  // checkable ingredients and steps that can be marked as done.
  const [servingsOverride, setServingsOverride] = useState<number | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [addingToShopping, setAddingToShopping] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRecipeById(id);
    }

    return () => {
      clearCurrentRecipe();
    };
  }, [id, fetchRecipeById, clearCurrentRecipe]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        variant: 'destructive',
      });
      clearError();
    }
  }, [error, toast, clearError]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-[1180px] px-4 py-4 sm:px-6 sm:py-6">
          <div className="mb-5 flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/recipes')}
              aria-label={t('buttons.back')}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md bg-card text-mf-text-soft shadow-[var(--mf-shadow-1)] transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-[19px] w-[19px]" />
            </button>
            <Skeleton className="h-4 w-48" />
          </div>
          <RecipeDetailsSkeleton />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('pages.recipes.recipeNotFound')}</h1>
          <Button onClick={() => navigate('/recipes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('pages.recipes.backToRecipes')}
          </Button>
        </div>
      </div>
    );
  }

  // ── Servings scaling ─────────────────────────────────────────────────────
  const baseServings = recipe.servings || 1;
  const servings = servingsOverride ?? baseServings;
  const scale = servings / baseServings;
  const scaleQuantity = (quantity: number | null | undefined): number | null =>
    quantity == null ? null : Math.round(quantity * scale * 100) / 100;

  const ingredientKey = (ingredientId: string | undefined, index: number) =>
    ingredientId ?? `ing-${index}`;

  const ingredientLabel = (ingredient: (typeof recipe.ingredients)[number]) => {
    const itemName = getItemDisplayName(ingredient?.item as Item, t);
    const isFree = Boolean(ingredient.isFreeQuantity) || isFreeQuantityUnit(ingredient.unit);
    const label = formatQuantityWithUnit(scaleQuantity(ingredient.quantity), ingredient.unit, t, {
      item: ingredient.item as { name?: string; pieceAlias?: string | null } | null,
      itemName,
      isFreeQuantity: isFree,
    });
    return { itemName, label };
  };

  const toggleIngredientChecked = (key: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleStepDone = (index: number) => {
    setDoneSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const checkedCount = recipe.ingredients.filter((ingredient, index) =>
    checkedIngredients.has(ingredientKey(ingredient.id, index))
  ).length;

  // ── Add missing (unchecked) ingredients to the shopping list ────────────
  // Free-quantity ingredients ("à l'œil": pinch/drizzle/knob) have no numeric
  // amount and use cooking units the shopping list rejects, so they never go
  // on the list — matching the backend's aggregateNeeds behaviour.
  const missingIngredients = recipe.ingredients.filter(
    (ingredient, index) =>
      ingredient.itemId &&
      !(Boolean(ingredient.isFreeQuantity) || isFreeQuantityUnit(ingredient.unit)) &&
      !checkedIngredients.has(ingredientKey(ingredient.id, index))
  );

  const handleAddMissingToShopping = async () => {
    if (missingIngredients.length === 0 || addingToShopping) return;
    setAddingToShopping(true);
    try {
      let added = 0;
      for (const ingredient of missingIngredients) {
        const quantity = scaleQuantity(ingredient.quantity);
        const created = await createShoppingItem({
          itemId: ingredient.itemId,
          quantity: String(quantity ?? 1),
          unit: ingredient.unit,
        });
        if (created) added++;
      }
      if (added > 0) {
        toast({
          title: t('pages.recipes.details.addedToShopping', { count: added }),
        });
      } else {
        toast({ title: t('messages.error.somethingWentWrong'), variant: 'destructive' });
      }
    } finally {
      setAddingToShopping(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe?.id) return;

    // Pre-flight: fetch deletion impact so the modal can warn about
    // cooked-meal portions that will also be removed.
    try {
      const impact = await getRecipeDeletionImpact(recipe.id);
      setDeletionImpact(impact);
      setDeleteDialogOpen(true);
    } catch {
      // If the impact endpoint fails, fall back to plain confirmation.
      setDeletionImpact(null);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!recipe?.id) return;
    setDeletingRecipe(true);
    try {
      const cookedMealItemId = deletionImpact?.cookedMealItemId ?? null;
      await deleteRecipe(recipe.id);
      // The backend cascade removed the StoredItems too — purge the local cache.
      if (cookedMealItemId) {
        removeStoredItemsByItemId(cookedMealItemId);
      }
      toast({
        title: t('pages.recipes.recipeDeleted'),
        description: t('pages.recipes.recipeRemovedFromCollection'),
      });
      setDeleteDialogOpen(false);
      navigate('/recipes');
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('pages.recipes.failedToDeleteRecipe'),
        variant: "destructive",
      });
    } finally {
      setDeletingRecipe(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!recipe?.id) return;

    try {
      await toggleFavorite(recipe.id);
      toast({
        title: t('messages.success.success'),
        description: recipe.isFavorite ? t('pages.recipes.removedFromFavorites') : t('pages.recipes.addedToFavorites'),
      });
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('pages.recipes.failedToUpdateFavoriteStatus'),
        variant: "destructive",
      });
    }
  };

  const getRelevantIngredientsForStep = (stepIndex: number) => {
    if (!recipe) return [];

    const relevantIngredients: number[] = [];

    recipe.ingredients.forEach((ingredient, index) => {
      if (ingredient.usedInSteps && ingredient.usedInSteps.includes(stepIndex)) {
        relevantIngredients.push(index);
        return;
      }

      if (!ingredient.usedInSteps || ingredient.usedInSteps.length === 0) {
        const stepText = recipe.instructions[stepIndex]?.text?.toLowerCase() ?? '';

        if (ingredient.notes && stepText.includes(ingredient.notes.toLowerCase())) {
          relevantIngredients.push(index);
        }
      }
    });

    return relevantIngredients;
  };

  const eyebrowTag = recipe.tags[0];
  const EyebrowIcon = eyebrowTag ? iconForTagLabel(eyebrowTag, t) : UtensilsCrossed;
  const difficultyDots = DIFFICULTY_DOTS[recipe.difficulty] ?? 1;
  const creatorName = recipe.creator
    ? recipe.creator.id === currentUser?.id
      ? t('common.you')
      : recipe.creator.displayName
    : null;
  const createdDate = recipe.createdAt
    ? new Date(recipe.createdAt).toLocaleDateString(i18n.language, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Add to Meals Dialog */}
      <ConfirmServingsDialog
        open={showAddToMealsDialog}
        onOpenChange={setShowAddToMealsDialog}
        defaultServings={recipe.servings ?? 1}
        recipeTitle={recipe.title}
        saving={addingMeal}
        onConfirm={async (servingsToAdd) => {
          try {
            await addMeal(recipe.id, servingsToAdd);
            toast({
              title: t('pages.meals.toasts.mealAdded', { title: recipe.title }),
            });
            setShowAddToMealsDialog(false);
          } catch (error) {
            toast({
              title: t('messages.error.somethingWentWrong'),
              variant: 'destructive',
            });
          }
        }}
      />

      {/* Consume Ingredients Dialog */}
      <ConsumeIngredientsDialog
        isOpen={showConsumeDialog}
        onClose={() => setShowConsumeDialog(false)}
        recipe={recipe}
      />

      {/* Header banner */}
      <div className="sticky top-0 z-30 border-b border-mf-night-line bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t('buttons.back')}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md bg-card text-mf-text-soft shadow-[var(--mf-shadow-1)] transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-[19px] w-[19px]" />
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {recipe.sourceUrl && (
              <button
                type="button"
                onClick={() => window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer')}
                title={t('pages.importRecipe.viewOriginal')}
                aria-label={t('pages.importRecipe.viewOriginal')}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-md bg-card text-mf-text-soft shadow-[var(--mf-shadow-1)] transition-colors hover:bg-muted"
              >
                <ExternalLink className="h-[19px] w-[19px]" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddToMealsDialog(true)}
              title={t('pages.meals.addRecipe')}
              aria-label={t('pages.meals.addRecipe')}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-md bg-card text-mf-text-soft shadow-[var(--mf-shadow-1)] transition-colors hover:bg-muted"
            >
              <Calendar className="h-[19px] w-[19px]" />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
              title={t('buttons.edit')}
              aria-label={t('buttons.edit')}
              className="inline-flex h-[42px] items-center gap-2 rounded-full bg-card px-3 py-2.5 font-display text-[13.5px] font-bold text-foreground shadow-[var(--mf-shadow-1)] transition-colors hover:bg-muted sm:px-4"
            >
              <PenLine className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t('buttons.edit')}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/recipes/${recipe.id}/cook?servings=${servings}`)}
              title={t('pages.recipes.startCooking')}
              aria-label={t('pages.recipes.startCooking')}
              className="inline-flex h-[42px] items-center gap-2 whitespace-nowrap rounded-full bg-mf-green px-3 py-2.5 font-display text-[13.5px] font-bold text-white shadow-[0_6px_16px_rgba(43,182,115,.32)] transition-colors hover:bg-mf-green-deep sm:px-4"
            >
              <ChefHat className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t('pages.recipes.startCooking')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-4 py-4 sm:px-6 sm:py-6">

        {/* Hero: photo + text */}
        <div className="mb-5 grid gap-6 md:grid-cols-[460px_1fr]">
          <div className="relative min-h-[240px] overflow-hidden rounded-[22px] bg-muted md:min-h-[320px]">
            {recipe.imageUrl ? (
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <ChefHat className="h-16 w-16 text-muted-foreground/40" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/30 to-transparent" />
            <button
              type="button"
              onClick={handleToggleFavorite}
              title={recipe.isFavorite ? t('pages.recipes.unfavorite') : t('pages.recipes.favorite')}
              aria-label={recipe.isFavorite ? t('pages.recipes.unfavorite') : t('pages.recipes.favorite')}
              className="absolute right-3.5 top-3.5 z-[1] flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-[var(--mf-shadow-1)] transition-transform hover:scale-105"
            >
              <Heart
                className={cn(
                  'h-[19px] w-[19px] text-mf-danger',
                  recipe.isFavorite && 'fill-mf-danger'
                )}
              />
            </button>
          </div>

          <div className="flex flex-col justify-center py-1">
            {eyebrowTag && (
              <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-mf-green-soft px-2.5 py-1 font-display text-[11.5px] font-bold uppercase tracking-[0.16em] text-mf-green-deep">
                <EyebrowIcon className="h-3 w-3" />
                {eyebrowTag}
              </span>
            )}
            <h1 className="mt-3.5 font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[42px]">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="mt-3 max-w-[46ch] text-[15.5px] leading-relaxed text-mf-text-soft">
                {recipe.description}
              </p>
            )}
            {recipe.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {recipe.tags.map((tag) => {
                  const TagIcon = iconForTagLabel(tag, t);
                  return (
                    <span
                      key={tag}
                      className={cn(
                        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 font-display text-[12.5px] font-bold',
                        'bg-mf-night-elevated text-mf-text-soft'
                      )}
                    >
                      <TagIcon className="h-3.5 w-3.5" />
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}
            {creatorName && (
              <div className="mt-5 flex items-center gap-2.5 border-t border-mf-night-line pt-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mf-orange-soft font-display text-[15px] font-extrabold text-mf-orange">
                  {(recipe.creator?.displayName || '?').charAt(0).toUpperCase()}
                </span>
                <span className="text-[13px] text-mf-text-mute">
                  {t('common.addedBy', { name: creatorName })}
                  {createdDate && <> · {createdDate}</>}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Meta bubbles (read-only) */}
        <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <div className="rounded-[20px] bg-mf-blue-soft p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-card">
              <Timer className="h-5 w-5 text-mf-blue" />
            </div>
            <div className="flex items-baseline gap-1 font-display text-[26px] font-extrabold leading-none tracking-[-0.02em] text-mf-blue">
              {recipe.prepTime}
              <span className="text-[15px] font-bold opacity-60">{t('pages.recipes.editor.minutesUnit')}</span>
            </div>
            <div className="mt-1.5 font-display text-[12.5px] font-semibold text-mf-text-soft">
              {t('pages.recipes.editor.prep')}
            </div>
          </div>
          <div className="rounded-[20px] bg-mf-orange-soft p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-card">
              <Flame className="h-5 w-5 text-mf-orange" />
            </div>
            <div className="flex items-baseline gap-1 font-display text-[26px] font-extrabold leading-none tracking-[-0.02em] text-mf-orange">
              {recipe.cookTime}
              <span className="text-[15px] font-bold opacity-60">{t('pages.recipes.editor.minutesUnit')}</span>
            </div>
            <div className="mt-1.5 font-display text-[12.5px] font-semibold text-mf-text-soft">
              {t('pages.recipes.editor.cook')}
            </div>
          </div>
          <div className="rounded-[20px] bg-mf-green-soft p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-card">
              <Users className="h-5 w-5 text-mf-green" />
            </div>
            <div className="flex items-baseline gap-1 font-display text-[26px] font-extrabold leading-none tracking-[-0.02em] text-mf-green-deep">
              {servings}
              <span className="text-[15px] font-bold opacity-60">{t('pages.recipes.editor.servingsUnit')}</span>
            </div>
            <div className="mt-1.5 font-display text-[12.5px] font-semibold text-mf-text-soft">
              {t('pages.recipes.editor.servingsLabel')}
            </div>
          </div>
          <div className="rounded-[20px] bg-mf-yellow-soft p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-card">
              <Gauge className="h-5 w-5 text-mf-yellow" />
            </div>
            <div className="flex items-center gap-2 font-display text-[22px] font-extrabold leading-none tracking-[-0.02em] text-mf-brown">
              {t(`pages.recipes.difficultyOptions.${recipe.difficulty.toLowerCase()}`)}
              <span className="inline-flex items-center gap-1">
                {[1, 2, 3].map((i) => (
                  <i
                    key={i}
                    className={cn(
                      'h-2 w-2 rounded-full',
                      i <= difficultyDots ? 'bg-mf-yellow' : 'bg-mf-night-line'
                    )}
                  />
                ))}
              </span>
            </div>
            <div className="mt-1.5 font-display text-[12.5px] font-semibold text-mf-text-soft">
              {t('pages.recipes.editor.difficultyLabel')}
            </div>
          </div>
        </div>

        {/* Body: ingredients | steps */}
        <div className="grid items-start gap-5 lg:grid-cols-[380px_1fr]">
          {/* Ingredients */}
          <div className="rounded-[22px] bg-card p-5 shadow-[var(--mf-shadow-2)] sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-mf-green-soft">
                <Carrot className="h-[18px] w-[18px] text-mf-green-deep" />
              </span>
              <h3 className="font-display text-xl font-bold tracking-tight">
                {t('pages.recipes.ingredients')}
              </h3>
              <span className="ml-auto font-display text-[13px] font-bold text-mf-text-mute">
                {checkedCount}/{recipe.ingredients.length}
              </span>
            </div>

            {/* Servings scaler */}
            <div className="mt-3.5 flex items-center gap-3 rounded-md bg-muted px-3 py-2.5">
              <span className="flex items-center gap-1.5 font-display text-[13px] font-bold text-mf-text-soft">
                <Users className="h-4 w-4 text-mf-green-deep" />
                {t('pages.recipes.details.adjustServings')}
              </span>
              <div className="ml-auto flex items-center gap-2 rounded-full bg-card p-1 shadow-[var(--mf-shadow-1)]">
                <button
                  type="button"
                  onClick={() => setServingsOverride(Math.max(1, servings - 1))}
                  disabled={servings <= 1}
                  aria-label="−"
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-muted text-mf-green-deep transition-colors hover:bg-mf-green-soft disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[52px] text-center font-display text-base font-extrabold">
                  {servings}{' '}
                  <small className="text-[11px] font-bold text-mf-text-mute">
                    {t('pages.recipes.editor.servingsUnit')}
                  </small>
                </span>
                <button
                  type="button"
                  onClick={() => setServingsOverride(Math.min(100, servings + 1))}
                  disabled={servings >= 100}
                  aria-label="+"
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-muted text-mf-green-deep transition-colors hover:bg-mf-green-soft disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Checkable ingredient rows */}
            <div className="mt-1.5">
              {recipe.ingredients.map((ingredient, index) => {
                const key = ingredientKey(ingredient.id, index);
                const done = checkedIngredients.has(key);
                const { itemName, label } = ingredientLabel(ingredient);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleIngredientChecked(key)}
                    className={cn(
                      'flex w-full items-center gap-3 py-2.5 text-left',
                      index > 0 && 'border-t border-dashed border-mf-night-line'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 text-white transition-colors',
                        done ? 'border-mf-green bg-mf-green' : 'border-mf-night-line bg-transparent'
                      )}
                    >
                      {done && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block text-sm transition-colors',
                          done ? 'text-mf-text-mute line-through' : 'text-foreground'
                        )}
                      >
                        {itemName}
                      </span>
                      {ingredient.notes && (
                        <span className="block text-xs text-mf-text-mute">{ingredient.notes}</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'whitespace-nowrap font-display text-sm font-extrabold',
                        done ? 'text-mf-text-mute' : 'text-mf-green-deep'
                      )}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer actions */}
            <div className="mt-4 space-y-2 border-t border-mf-night-line pt-3.5">
              <button
                type="button"
                onClick={handleAddMissingToShopping}
                disabled={missingIngredients.length === 0 || addingToShopping}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-mf-green-soft px-4 py-3 font-display text-[13.5px] font-bold text-mf-green-deep transition-colors hover:bg-mf-green-soft/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
                {t('pages.recipes.details.addMissingToShopping')}
              </button>
              <button
                type="button"
                onClick={() => setShowConsumeDialog(true)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-muted px-4 py-3 font-display text-[13.5px] font-bold text-foreground transition-colors hover:bg-mf-night-line"
              >
                <UtensilsCrossed className="h-4 w-4" />
                {t('pages.recipes.consume.button')}
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="rounded-[22px] bg-card p-5 shadow-[var(--mf-shadow-2)] sm:p-6">
            <div className="mb-3.5 flex items-center gap-3">
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-mf-orange-soft">
                <ListOrdered className="h-[18px] w-[18px] text-mf-orange" />
              </span>
              <h3 className="font-display text-xl font-bold tracking-tight">
                {t('pages.recipes.editor.stepsTitle')}
              </h3>
              <span className="ml-auto font-display text-[13px] font-bold text-mf-text-mute">
                {t('pages.recipes.editor.stepCount', { count: recipe.instructions.length })}
                {recipe.totalTime > 0 && (
                  <> · {recipe.totalTime} {t('pages.recipes.editor.minutesUnit')}</>
                )}
              </span>
            </div>

            <div className="relative">
              {recipe.instructions.length > 1 && (
                <div className="absolute bottom-5 left-[17px] top-3.5 w-0.5 bg-mf-night-line" aria-hidden="true" />
              )}
              {recipe.instructions.map((instruction, index) => {
                const done = doneSteps.has(index);
                const relevantIngredients = getRelevantIngredientsForStep(index);
                return (
                  <div key={index} className="relative grid grid-cols-[36px_1fr] gap-4 pb-4 last:pb-0">
                    <button
                      type="button"
                      onClick={() => toggleStepDone(index)}
                      title={t('pages.recipes.details.markStepDone')}
                      aria-label={t('pages.recipes.details.markStepDone')}
                      className={cn(
                        'z-[1] flex h-9 w-9 items-center justify-center rounded-full font-display text-[15px] font-extrabold text-white ring-[5px] ring-card transition-colors',
                        done ? 'bg-mf-green-deep' : 'bg-mf-green'
                      )}
                    >
                      {index + 1}
                    </button>
                    <div
                      className={cn(
                        'rounded-2xl bg-muted p-4 transition-opacity',
                        done && 'opacity-60'
                      )}
                    >
                      <p className="text-sm leading-relaxed text-foreground">{instruction.text}</p>
                      {(instruction.duration != null || relevantIngredients.length > 0) && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {instruction.duration != null && instruction.duration > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 font-display text-xs font-bold text-mf-text-soft">
                              <Clock className="h-3.5 w-3.5 text-mf-orange" />
                              {Math.round(instruction.duration / 60)} {t('pages.recipes.editor.minutesUnit')}
                            </span>
                          )}
                          {relevantIngredients.map((ingredientIndex) => {
                            const ingredient = recipe.ingredients[ingredientIndex];
                            const { itemName, label } = ingredientLabel(ingredient);
                            return (
                              <span
                                key={ingredient.id ?? ingredientIndex}
                                title={ingredient.notes || undefined}
                                className="inline-flex items-center gap-1.5 rounded-full bg-mf-green-soft px-2.5 py-1 font-display text-xs font-bold text-mf-green-deep"
                              >
                                {itemName}
                                {label && <span className="font-semibold opacity-65">{label}</span>}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Delete zone */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-mf-danger/30 bg-mf-danger-soft/60 p-5">
          <div>
            <h3 className="font-display font-bold">{t('pages.recipes.deleteRecipe')}</h3>
            <p className="text-sm text-mf-text-soft">{t('pages.recipes.deleteWarning')}</p>
          </div>
          <Button variant="delete" onClick={handleDelete}>
            {t('pages.recipes.deleteRecipe')}
          </Button>
        </div>

        {/* Recipe deletion confirmation modal — warns about cooked-meal portions
            that will be removed in cascade. */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('cookedMeal.deleteRecipe.title')}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block">
                  {t('cookedMeal.deleteRecipe.intro', { title: recipe?.title ?? '' })}
                </span>
                {deletionImpact?.hasCookedMealItem && deletionImpact.totalPortions > 0 && (
                  <span className="block">
                    {t('cookedMeal.deleteRecipe.impact', {
                      count: deletionImpact.totalPortions,
                      portions: deletionImpact.totalPortions,
                      dishName: deletionImpact.cookedMealItemName ?? '',
                    })}
                  </span>
                )}
                {deletionImpact?.hasCookedMealItem && (
                  <span className="block font-medium text-destructive">
                    {t('cookedMeal.deleteRecipe.warning')}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingRecipe}>
                {t('cookedMeal.deleteRecipe.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deletingRecipe}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('cookedMeal.deleteRecipe.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

const RecipeDetailsSkeleton = () => {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="grid gap-6 md:grid-cols-[460px_1fr]">
        <Skeleton className="min-h-[240px] rounded-[22px] md:min-h-[320px]" />
        <div className="flex flex-col justify-center gap-3 py-1">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </div>
      </div>

      {/* Meta bubbles */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[118px] rounded-[20px]" />
        ))}
      </div>

      {/* Body */}
      <div className="grid items-start gap-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-3 rounded-[22px] bg-card p-5 shadow-[var(--mf-shadow-2)] sm:p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-full rounded-md" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="h-[22px] w-[22px] rounded-[7px]" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
        <div className="space-y-4 rounded-[22px] bg-card p-5 shadow-[var(--mf-shadow-2)] sm:p-6">
          <Skeleton className="h-6 w-36" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[36px_1fr] gap-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecipeDetails;
