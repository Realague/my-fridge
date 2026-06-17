import { useTranslation } from 'react-i18next';
import { Check, AlertTriangle, ShoppingBasket } from 'lucide-react';
import type { RecipeAvailabilityDto } from '@/services/mealService';

interface Props {
  availability?: RecipeAvailabilityDto;
}

export const RecipeAvailabilityBadge = ({ availability }: Props) => {
  const { t } = useTranslation();
  if (!availability) return null;

  if (availability.status === 'haveAll') {
    return (
      <span className="mf-badge mf-badge-green">
        <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {t('pages.meals.selector.haveAll')}
      </span>
    );
  }

  if (availability.status === 'usesExpiring') {
    const item = availability.expiringIngredients[0] ?? '';
    return (
      <span className="mf-badge mf-badge-warn">
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {t('pages.meals.selector.usesExpiring', { item })}
      </span>
    );
  }

  return (
    <span className="mf-badge mf-badge-neutral">
      <ShoppingBasket className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      {t('pages.meals.selector.missingCount', { count: availability.missingCount })}
    </span>
  );
};
