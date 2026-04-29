import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import BottomNavigation from '@/components/BottomNavigation';
import { MealRow } from '@/components/meals/MealRow';
import { AvailabilitySummaryCard } from '@/components/meals/AvailabilitySummaryCard';
import { useMealStore } from '@/stores/mealStore';

const Meals = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedHouseholdId } = useProtectedRoute();

  const {
    meals,
    availability,
    loading,
    saving,
    removing,
    loadingAvailability,
    fetchMeals,
    fetchAvailability,
    updateServings,
    removeMeal,
    generateShoppingList,
  } = useMealStore();

  const [preparingList, setPreparingList] = useState(false);

  useEffect(() => {
    if (selectedHouseholdId) fetchMeals();
  }, [selectedHouseholdId, fetchMeals]);

  useEffect(() => {
    if (selectedHouseholdId) fetchAvailability();
  }, [selectedHouseholdId, meals, fetchAvailability]);

  const adjust = async (id: string, delta: number) => {
    const meal = meals.find((m) => m.id === id);
    if (!meal) return;
    const next = meal.servings + delta;
    if (next < 1 || next > 20) return;
    try {
      await updateServings(id, next);
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: error instanceof Error ? error.message : '',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeMeal(id);
      toast({ title: t('pages.meals.toasts.mealRemoved') });
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: error instanceof Error ? error.message : '',
        variant: 'destructive',
      });
    }
  };

  const prepareList = async () => {
    setPreparingList(true);
    try {
      const items = await generateShoppingList();
      toast({
        title: t('pages.meals.toasts.shoppingListReady'),
        description: t('pages.meals.toasts.shoppingListReadyDescription', { count: items.length }),
      });
      navigate('/shopping');
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: error instanceof Error ? error.message : '',
        variant: 'destructive',
      });
    } finally {
      setPreparingList(false);
    }
  };

  const count = meals.length;

  return (
    <div className="mf-page min-h-screen pb-32 sm:pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-8 sm:pt-10">

        {/* En-tête de page (motif charter v3) */}
        <header
          className="mf-card flex flex-wrap items-center justify-between gap-6 p-5 sm:p-6"
        >
          <div>
            <div className="mf-eyebrow mb-2">{t('pages.meals.kicker')}</div>
            <h1 className="mf-display text-[28px] leading-tight text-[color:var(--mf-text)]">
              {t('pages.meals.title')}
            </h1>
            <div className="mt-2 text-[13px] text-[color:var(--mf-text-soft)]">
              {count === 0
                ? t('pages.meals.subtitleEmpty')
                : t('pages.meals.subtitle', { count })}
              {availability && availability.totalIngredients > 0 ? (
                <>
                  {' · '}
                  <span className="text-[color:var(--mf-green)]">
                    ● {t('pages.meals.synced')}
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <div className="text-right">
            <div className="mf-stat">{count}</div>
            <div className="mf-caption mt-1">{t('pages.meals.statCaption')}</div>
          </div>
        </header>

        {/* Liste signature */}
        <section className="mt-6 mf-fade-in">
          {count > 0 ? (
            <div className="mf-list">
              <div className="mf-list-header">
                <div className="flex items-center gap-2 text-[15px] font-semibold text-[color:var(--mf-text)]">
                  <span className="text-[color:var(--mf-green-leaf)]">🍽️</span>
                  {t('pages.meals.sectionPlanned')}
                </div>
                <span className="text-[13px] text-[color:var(--mf-text-soft)]">
                  {t('pages.meals.subtitle', { count })}
                </span>
              </div>
              {meals.map((meal) => (
                <MealRow
                  key={meal.id}
                  meal={meal}
                  disabled={saving || removing}
                  onIncrement={() => adjust(meal.id, 1)}
                  onDecrement={() => adjust(meal.id, -1)}
                  onRemove={() => handleRemove(meal.id)}
                />
              ))}
            </div>
          ) : !loading ? (
            <div className="mf-card p-10 text-center">
              <UtensilsCrossed
                className="mx-auto h-8 w-8 text-[color:var(--mf-text-mute)]"
                strokeWidth={1.4}
                aria-hidden
              />
              <p className="mt-4 text-[15px] text-[color:var(--mf-text)]">
                {t('pages.meals.empty.title')}
              </p>
              <p className="mt-2 text-[13px] text-[color:var(--mf-text-soft)]">
                {t('pages.meals.empty.subtitle')}
              </p>
            </div>
          ) : null}
        </section>

        {/* CTA ajout */}
        <button
          type="button"
          onClick={() => navigate('/meals/add')}
          className="mf-btn mf-btn-primary mt-4 w-full"
        >
          <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
          {t('pages.meals.addRecipe')}
        </button>

        {/* Inventaire vs menu */}
        {count > 0 ? (
          <section className="mt-6 mf-fade-in">
            <AvailabilitySummaryCard
              availability={availability}
              loading={loadingAvailability}
              onPrepareList={prepareList}
              preparingList={preparingList}
            />
          </section>
        ) : null}
      </div>

      <BottomNavigation currentPage="meals" />
    </div>
  );
};

export default Meals;
