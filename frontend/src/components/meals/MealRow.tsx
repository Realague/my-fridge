import { useTranslation } from 'react-i18next';
import { ChefHat, Clock, Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MealDto } from '@/services/mealService';
import { getRecipeCategory } from '@/types/recipeCategory';

interface Props {
  meal: MealDto;
  disabled?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onCook: () => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  vegetarian: '🥗',
  fish: '🐟',
  meat: '🥩',
  pasta: '🍝',
  dessert: '🍰',
  other: '🍽️',
};

export const MealRow = ({
  meal,
  disabled,
  onIncrement,
  onDecrement,
  onRemove,
  onCook,
}: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const recipe = meal.recipe;
  const totalTime = (recipe?.prepTime ?? 0) + (recipe?.cookTime ?? 0);
  const category = getRecipeCategory(recipe?.tags);
  const emoji = category ? CATEGORY_EMOJI[category] : '🍽️';

  const openRecipe = () => {
    if (recipe?.id) navigate(`/recipes/${recipe.id}`);
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-muted hover:bg-accent transition-colors">
      <button
        type="button"
        onClick={openRecipe}
        className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-background flex items-center justify-center text-2xl border border-border"
        aria-label={recipe?.title ?? ''}
      >
        {recipe?.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden>{emoji}</span>
        )}
      </button>

      <button
        type="button"
        onClick={openRecipe}
        className="flex flex-1 min-w-0 flex-col text-left"
      >
        <span className="font-medium text-foreground line-clamp-2 sm:line-clamp-1">
          {recipe?.title ?? '—'}
        </span>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="tabular-nums">{t('pages.meals.minutes', { count: totalTime })}</span>
          </span>
          {category && (
            <Badge variant="secondary" className="text-xs">
              {t(`pages.meals.categories.${category}`)}
            </Badge>
          )}
        </div>
      </button>

      <div className="flex flex-shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDecrement}
          disabled={disabled || meal.servings <= 1}
          className="h-8 w-8 p-0"
          aria-label={t('pages.meals.decreaseServings')}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="tabular-nums min-w-[1.5rem] text-center text-base font-semibold text-foreground">
          {meal.servings}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onIncrement}
          disabled={disabled || meal.servings >= 20}
          className="h-8 w-8 p-0"
          aria-label={t('pages.meals.increaseServings')}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onCook}
        disabled={disabled}
        className="h-8 w-8 p-0 shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
        aria-label={t('pages.meals.cookMeal')}
        title={t('pages.meals.cookMeal')}
      >
        <ChefHat className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={disabled}
        className="h-8 w-8 p-0 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
        aria-label={t('pages.meals.removeMeal')}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
