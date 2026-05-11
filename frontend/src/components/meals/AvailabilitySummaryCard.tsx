import { useTranslation } from 'react-i18next';
import { ShoppingCart, CheckCircle2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!availability || availability.totalIngredients === 0) {
    return null;
  }

  const { missingCount, inStockCount, onShoppingListCount } = availability;
  const allCovered = missingCount === 0;

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              {t('pages.meals.availability.kicker')}
            </p>
            <CardTitle className="text-base font-medium">
              {allCovered
                ? t('pages.meals.availability.allCoveredHeadline')
                : t('pages.meals.availability.headline', { count: missingCount })}
            </CardTitle>
          </div>
          <div className="text-right">
            <div
              className={`text-2xl font-bold ${
                allCovered ? 'text-mf-green' : 'text-mf-warning'
              }`}
            >
              {missingCount}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('pages.meals.availability.missingCaption')}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-4 border-t border-border pt-4 flex-wrap">
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-mf-green" />
              {t('pages.meals.availability.inStockLine', { count: inStockCount })}
            </div>
            {onShoppingListCount > 0 && (
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-mf-warning" />
                {t('pages.meals.availability.onShoppingListLine', { count: onShoppingListCount })}
              </div>
            )}
          </div>
          <Button
            variant="green"
            onClick={onPrepareList}
            disabled={preparingList}
            className="gap-1.5"
          >
            <ShoppingCart className="h-4 w-4" />
            {allCovered
              ? t('pages.meals.availability.reviewList')
              : t('pages.meals.availability.prepareList')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
