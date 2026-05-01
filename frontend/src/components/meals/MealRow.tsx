import { useTranslation } from 'react-i18next';
import { Clock, Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MealDto } from '@/services/mealService';
import { getRecipeCategory } from '@/types/recipeCategory';

interface Props {
  meal: MealDto;
  disabled?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  vegetarian: '🥗',
  fish: '🐟',
  meat: '🥩',
  pasta: '🍝',
  dessert: '🍰',
  other: '🍽️',
};

export const MealRow = ({ meal, disabled, onIncrement, onDecrement, onRemove }: Props) => {
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
    <div
      className="flex items-center gap-4 px-5 py-3.5 border-t"
      style={{ borderColor: 'var(--mf-night-line)' }}
    >
      <button
        type="button"
        onClick={openRecipe}
        className="mf-thumb mf-thumb-lg overflow-hidden p-0"
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
        className="flex flex-1 min-w-0 flex-col gap-1 text-left"
      >
        <div className="text-[15px] font-semibold text-[color:var(--mf-text)] truncate">
          {recipe?.title ?? '—'}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[color:var(--mf-text-mute)]">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            <span className="tabular-nums">{t('pages.meals.minutes', { count: totalTime })}</span>
          </span>
          {category ? (
            <span className="mf-badge mf-badge-green">
              {t(`pages.meals.categories.${category}`)}
            </span>
          ) : null}
        </div>
      </button>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onDecrement}
          disabled={disabled || meal.servings <= 1}
          className="mf-stepper-btn"
          aria-label={t('pages.meals.decreaseServings')}
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <span className="mf-display tabular-nums min-w-[1.5rem] text-center text-[18px] text-[color:var(--mf-text)]">
          {meal.servings}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={disabled || meal.servings >= 20}
          className="mf-stepper-btn"
          aria-label={t('pages.meals.increaseServings')}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="mf-icon-btn mf-icon-btn-danger flex-shrink-0"
        aria-label={t('pages.meals.removeMeal')}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.8} />
      </button>
    </div>
  );
};
