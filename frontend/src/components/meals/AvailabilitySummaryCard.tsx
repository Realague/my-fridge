import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react';
import type { MealsAvailabilityDto } from '@/services/mealService';

interface Props {
  availability: MealsAvailabilityDto | null;
  loading: boolean;
  onPrepareList: () => void;
  preparingList: boolean;
}

export const AvailabilitySummaryCard = ({
  availability,
  loading,
  onPrepareList,
  preparingList,
}: Props) => {
  const { t } = useTranslation();

  if (loading && !availability) {
    return (
      <div className="mf-card p-6">
        <div className="h-16 animate-pulse rounded-md bg-[color:var(--mf-night-elevated)]" />
      </div>
    );
  }

  if (!availability || availability.totalIngredients === 0) {
    return null;
  }

  const { missingCount, inStockCount, onShoppingListCount } = availability;
  const allCovered = missingCount === 0;

  return (
    <div className="mf-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="mf-section-title mb-2">
            {t('pages.meals.availability.kicker')}
          </div>
          <div className="text-[15px] text-[color:var(--mf-text)]">
            {allCovered
              ? t('pages.meals.availability.allCoveredHeadline')
              : t('pages.meals.availability.headline', { count: missingCount })}
          </div>
        </div>
        <div className="text-right">
          <div className="mf-stat" style={!allCovered ? { color: 'var(--mf-warning)' } : undefined}>
            {missingCount}
          </div>
          <div className="mf-caption mt-1">
            {t('pages.meals.availability.missingCaption')}
          </div>
        </div>
      </div>

      <div
        className="mt-5 flex items-end justify-between gap-4 border-t pt-4"
        style={{ borderColor: 'var(--mf-night-line)' }}
      >
        <div className="flex flex-col gap-1.5 text-[13px] text-[color:var(--mf-text-soft)]">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--mf-green)]" aria-hidden />
            {t('pages.meals.availability.inStockLine', { count: inStockCount })}
          </div>
          {onShoppingListCount > 0 ? (
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full bg-[color:var(--mf-warning)]"
                aria-hidden
              />
              {t('pages.meals.availability.onShoppingListLine', { count: onShoppingListCount })}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onPrepareList}
          disabled={preparingList}
          className="mf-btn mf-btn-primary"
        >
          <ShoppingCart className="h-4 w-4" strokeWidth={2} aria-hidden />
          {allCovered
            ? t('pages.meals.availability.reviewList')
            : t('pages.meals.availability.prepareList')}
        </button>
      </div>
    </div>
  );
};
