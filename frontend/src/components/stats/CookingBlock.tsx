import { useTranslation } from 'react-i18next';
import { ChefHat, Heart } from 'lucide-react';
import type { CookingStats } from '@/services/statsService';
import { CategoryBars, type CategoryBar } from './CategoryBars';
import { TrendBadge } from './TrendBadge';

interface CookingBlockProps {
  cooking: CookingStats;
  comparedTo: string | null;
  showTrends: boolean;
}

/**
 * Bloc 2 — Cuisine.
 *
 * The design also specs a "portions batch cooking" tile, which the ticket
 * gates on the batch-cooking feature shipping. That feature does not exist in
 * the codebase yet, so the tile is left out rather than hard-coded to zero.
 */
export function CookingBlock({ cooking, comparedTo, showTrends }: CookingBlockProps) {
  const { t } = useTranslation();

  const dishBars: CategoryBar[] = cooking.topDishCategories.map((entry, index) => ({
    key: entry.category,
    label: t(`pages.meals.categories.${entry.category}`),
    value: String(entry.count),
    weight: entry.count,
    color: 'var(--mf-green)',
    rank: index + 1,
  }));

  return (
    <section id="stats-cooking" className="flex scroll-mt-4 flex-col gap-3.5">
      <header className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-mf-pink-soft text-mf-pink-deep"
        >
          <ChefHat className="h-[17px] w-[17px]" strokeWidth={2.3} />
        </span>
        <h2 className="m-0 font-display text-lg font-bold tracking-tight text-mf-text sm:text-xl">
          {t('stats.cooking.title')}
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-3">
        <div className="col-span-2 flex flex-col gap-1.5 rounded-lg border border-mf-night-line bg-mf-night-surface p-4 lg:col-span-1">
          <span className="mf-eyebrow text-mf-text-mute">{t('stats.cooking.cooked')}</span>
          <span className="font-display text-[32px] font-bold leading-tight tracking-tight text-mf-pink-deep">
            {cooking.cookedCount}
          </span>
          {showTrends && (
            <TrendBadge
              delta={cooking.cookedCountDelta}
              comparedTo={comparedTo}
              className="self-start"
            />
          )}
          <span className="text-[11.5px] font-medium leading-snug text-mf-text-soft">
            {t('stats.cooking.cookedCaption')}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg border border-mf-night-line bg-mf-night-surface p-4">
          <span className="mf-eyebrow text-mf-text-mute">{t('stats.cooking.distinct')}</span>
          <span className="font-display text-[32px] font-bold leading-tight tracking-tight text-mf-text">
            {cooking.distinctRecipes}
          </span>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-mf-night-line bg-mf-night-surface p-4">
          <span className="mf-eyebrow text-mf-text-mute">{t('stats.cooking.mealPlan')}</span>
          <span className="font-display text-[32px] font-bold leading-tight tracking-tight text-mf-text">
            {cooking.mealPlanCompletion === null ? '—' : `${cooking.mealPlanCompletion} %`}
          </span>
          <span className="block h-2 overflow-hidden rounded-full bg-mf-night-elevated">
            <span
              className="block h-full rounded-full bg-mf-pink"
              style={{ width: `${cooking.mealPlanCompletion ?? 0}%` }}
            />
          </span>
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-[1fr_1.1fr] lg:gap-3">
        {cooking.favoriteRecipe?.title && (
          <div className="flex flex-col justify-center gap-1.5 rounded-xl bg-mf-pink-soft p-[18px] sm:p-5">
            <span className="mf-eyebrow flex items-center gap-2 text-mf-pink-deep">
              <Heart className="h-4 w-4" strokeWidth={2} aria-hidden />
              {t('stats.cooking.favorite')}
            </span>
            <div className="font-display text-xl font-bold leading-tight tracking-tight text-mf-text sm:text-2xl">
              {cooking.favoriteRecipe.title}
            </div>
            <div className="text-[13.5px] font-medium text-mf-text-soft">
              {t('stats.cooking.favoriteCaption', { count: cooking.favoriteRecipe.count })}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-3 rounded-xl border border-mf-night-line bg-mf-night-surface p-[18px] sm:p-5">
          <span className="mf-eyebrow text-mf-text-mute">{t('stats.cooking.topDishes')}</span>
          {dishBars.length > 0 ? (
            <CategoryBars bars={dishBars} />
          ) : (
            <p className="m-0 text-sm text-mf-text-soft">{t('stats.cooking.topDishesEmpty')}</p>
          )}
        </div>
      </div>
    </section>
  );
}
