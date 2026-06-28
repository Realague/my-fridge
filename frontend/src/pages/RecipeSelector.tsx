import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Beef, CakeSlice, Clock, Fish, Filter, Salad, Search, Soup, UtensilsCrossed, Users, type LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useRecipeStore } from '@/stores/recipeStore';
import { useMealStore } from '@/stores/mealStore';
import type { RecipeListDto } from '@/services/recipeService';
import { RecipeAvailabilityBadge } from '@/components/meals/RecipeAvailabilityBadge';
import { ConfirmServingsDialog } from '@/components/meals/ConfirmServingsDialog';
import { getRecipeCategory } from '@/types/recipeCategory';

type FilterKey = 'all' | 'haveAll' | 'quick' | 'vegetarian';

const QUICK_THRESHOLD_MIN = 30;

const CATEGORY_ICON: Record<string, LucideIcon> = {
  vegetarian: Salad,
  fish: Fish,
  meat: Beef,
  pasta: Soup,
  dessert: CakeSlice,
  other: UtensilsCrossed,
};

const RecipeSelector = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedHouseholdId } = useProtectedRoute();

  const { recipes, loading: loadingRecipes, fetchRecipes } = useRecipeStore();
  const {
    recipesAvailability,
    loadingRecipesAvailability,
    fetchRecipesAvailability,
    addMeal,
    saving,
  } = useMealStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [confirmRecipe, setConfirmRecipe] = useState<RecipeListDto | null>(null);

  useEffect(() => {
    if (selectedHouseholdId) {
      fetchRecipes();
      fetchRecipesAvailability();
    }
  }, [selectedHouseholdId, fetchRecipes, fetchRecipesAvailability]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (recipes || []).filter((recipe) => {
      if (q) {
        const inTitle = recipe.title.toLowerCase().includes(q);
        const inDesc = recipe.description?.toLowerCase().includes(q) ?? false;
        const inTags = recipe.tags?.some((tag) => tag.toLowerCase().includes(q)) ?? false;
        if (!inTitle && !inDesc && !inTags) return false;
      }
      if (filter === 'quick') {
        const total = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
        if (total >= QUICK_THRESHOLD_MIN) return false;
      }
      if (filter === 'vegetarian') {
        const isVeg = recipe.tags?.some((tag) => tag.toLowerCase() === 'vegetarian');
        if (!isVeg) return false;
      }
      if (filter === 'haveAll') {
        const status = recipesAvailability[recipe.id]?.status;
        if (status !== 'haveAll' && status !== 'usesExpiring') return false;
      }
      return true;
    });
  }, [recipes, searchQuery, filter, recipesAvailability]);

  const confirm = async (servings: number) => {
    if (!confirmRecipe) return;
    try {
      await addMeal(confirmRecipe.id, servings);
      toast({ title: t('pages.meals.toasts.mealAdded', { title: confirmRecipe.title }) });
      setConfirmRecipe(null);
      navigate('/meals');
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mf-page min-h-screen pb-24">
      <div className="px-4 pt-6 sm:px-8 sm:pt-10">

        <header className="mf-card flex items-center gap-4 p-4">
          <button
            type="button"
            onClick={() => navigate('/meals')}
            className="mf-icon-btn h-10 w-10 text-[color:var(--mf-text)]"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <div>
            <div className="mf-eyebrow mb-1">{t('pages.meals.selector.kicker')}</div>
            <h1 className="mf-display text-[20px] leading-tight text-[color:var(--mf-text)]">
              {t('pages.meals.selector.title')}
            </h1>
          </div>
        </header>

        {/* Recherche */}
        <div className="relative mt-4">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--mf-text-mute)]"
            strokeWidth={1.8}
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('pages.meals.selector.search') as string}
            className="mf-input pl-11"
          />
        </div>

        {/* Filter bar — toggle group */}
        <div className="mf-filter-bar mt-3">
          <Filter
            className="h-4 w-4 text-[color:var(--mf-text-mute)]"
            strokeWidth={1.8}
            aria-label={t('pages.meals.selector.filtersLabel') as string}
          />
          <div className="mf-toggle-group" role="tablist">
            {(['all', 'haveAll', 'quick', 'vegetarian'] as FilterKey[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={`mf-toggle-opt${filter === key ? ' is-active' : ''}`}
              >
                {t(`pages.meals.selector.filters.${key}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des recettes */}
        <section className="mt-4 mf-fade-in">
          {loadingRecipes && filtered.length === 0 ? (
            <div className="mf-list">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-3.5 border-t"
                  style={{ borderColor: 'var(--mf-night-line)' }}
                >
                  <div className="mf-thumb mf-thumb-lg animate-pulse bg-[color:var(--mf-night-line)] flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-[color:var(--mf-night-line)]" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-[color:var(--mf-night-line)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mf-card p-10 text-center">
              <p className="text-[15px] text-[color:var(--mf-text)]">
                {t('pages.meals.selector.empty.title')}
              </p>
              <p className="mt-2 text-[13px] text-[color:var(--mf-text-soft)]">
                {t('pages.meals.selector.empty.subtitle')}
              </p>
            </div>
          ) : (
            <div className="mf-list">
              {filtered.map((recipe) => {
                const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
                const availability = recipesAvailability[recipe.id];
                const category = getRecipeCategory(recipe.tags);
                const CategoryIcon = (category && CATEGORY_ICON[category]) || UtensilsCrossed;
                return (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => setConfirmRecipe(recipe)}
                    className="flex w-full items-center gap-4 px-5 py-3.5 border-t text-left transition-colors hover:bg-[color:var(--mf-night-elevated)]"
                    style={{ borderColor: 'var(--mf-night-line)' }}
                  >
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt=""
                        className="h-14 w-14 flex-shrink-0 rounded-md border border-[color:var(--mf-night-line)] object-cover"
                      />
                    ) : (
                      <div className="mf-thumb mf-thumb-lg flex-shrink-0">
                        <CategoryIcon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
                      </div>
                    )}
                    <div className="flex flex-1 min-w-0 flex-col gap-1.5">
                      <div className="text-[15px] font-semibold text-[color:var(--mf-text)] truncate">
                        {recipe.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--mf-text-mute)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                          <span className="tabular-nums">
                            {t('pages.meals.minutes', { count: totalTime })}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                          <span className="tabular-nums">
                            {t('pages.meals.servings', { count: recipe.servings })}
                          </span>
                        </span>
                      </div>
                      {loadingRecipesAvailability && !availability ? (
                        <div className="h-5 w-32 animate-pulse rounded-full bg-[color:var(--mf-night-line)]" />
                      ) : (
                        <div>
                          <RecipeAvailabilityBadge availability={availability} />
                        </div>
                      )}
                    </div>
                    <span
                      className="flex-shrink-0 text-[18px] leading-none"
                      style={{ color: 'var(--mf-text-mute)' }}
                      aria-hidden
                    >
                      ›
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <ConfirmServingsDialog
        open={!!confirmRecipe}
        onOpenChange={(open) => {
          if (!open) setConfirmRecipe(null);
        }}
        defaultServings={confirmRecipe?.servings ?? 1}
        recipeTitle={confirmRecipe?.title ?? ''}
        saving={saving}
        onConfirm={confirm}
      />
    </div>
  );
};

export default RecipeSelector;
