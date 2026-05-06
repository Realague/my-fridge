import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, UtensilsCrossed, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import BottomNavigation from '@/components/BottomNavigation';
import { MealRow } from '@/components/meals/MealRow';
import { AvailabilitySummaryCard } from '@/components/meals/AvailabilitySummaryCard';
import { MealRemovalImpactDialog } from '@/components/meals/MealRemovalImpactDialog';
import { useMealStore } from '@/stores/mealStore';
import type { MealRemovalImpactDto } from '@/services/mealService';
import { motion, useReducedMotion } from 'framer-motion';
import { scrollRevealFadeUp } from '@/lib/motion';

const Meals = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedHouseholdId } = useProtectedRoute();
  const prefersReducedMotion = useReducedMotion() ?? false;

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
    getRemovalImpact,
    confirmRemoval,
  } = useMealStore();

  const [preparingList] = useState(false);
  const [removalImpact, setRemovalImpact] = useState<MealRemovalImpactDto | null>(null);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);

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
      const impact = await getRemovalImpact(id);
      const hasImpact =
        impact.toRemove.length +
          impact.toReduce.length +
          impact.alreadyPurchased.length +
          impact.noImpact.length >
        0;
      if (!hasImpact) {
        await removeMeal(id);
        toast({ title: t('pages.meals.toasts.mealRemoved') });
        return;
      }
      setRemovalImpact(impact);
      setPendingRemovalId(id);
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: error instanceof Error ? error.message : '',
        variant: 'destructive',
      });
    }
  };

  const handleRemovalConfirm = async (
    actions: { shoppingItemId: string; action: 'remove' | 'reduce' | 'keep'; newQuantity?: number }[]
  ) => {
    if (!pendingRemovalId) return;
    try {
      await confirmRemoval(pendingRemovalId, actions);
      toast({ title: t('pages.meals.toasts.mealRemoved') });
      setRemovalImpact(null);
      setPendingRemovalId(null);
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: error instanceof Error ? error.message : '',
        variant: 'destructive',
      });
    }
  };

  const prepareList = () => {
    navigate('/meals/shopping-preview');
  };

  const count = meals.length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground">{t('pages.meals.title')}</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground">
                  {count === 0
                    ? t('pages.meals.subtitleEmpty')
                    : t('pages.meals.subtitle', { count })}
                </p>
                {availability && availability.totalIngredients > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-600">{t('pages.meals.synced')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{count}</div>
              <div className="text-xs text-muted-foreground">{t('pages.meals.statCaption')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Liste des repas */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span aria-hidden>🍽️</span>
                {t('pages.meals.sectionPlanned')}
              </CardTitle>
              <Button
                variant="green"
                size="sm"
                onClick={() => navigate('/meals/add')}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('pages.meals.addRecipe')}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {count > 0 ? (
              <div className="space-y-3">
                {meals.map((meal) => (
                  <motion.div
                    key={meal.id}
                    {...scrollRevealFadeUp(prefersReducedMotion)}
                  >
                    <MealRow
                      meal={meal}
                      disabled={saving || removing}
                      onIncrement={() => adjust(meal.id, 1)}
                      onDecrement={() => adjust(meal.id, -1)}
                      onRemove={() => handleRemove(meal.id)}
                    />
                  </motion.div>
                ))}
              </div>
            ) : !loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('pages.meals.empty.title')}</p>
                <p className="text-sm mt-1">{t('pages.meals.empty.subtitle')}</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p>{t('common.loading')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventaire vs menu */}
        {count > 0 && (
          <AvailabilitySummaryCard
            availability={availability}
            loading={loadingAvailability}
            onPrepareList={prepareList}
            preparingList={preparingList}
          />
        )}
      </div>

      <MealRemovalImpactDialog
        open={!!removalImpact}
        onOpenChange={(open) => {
          if (!open) {
            setRemovalImpact(null);
            setPendingRemovalId(null);
          }
        }}
        impact={removalImpact}
        saving={removing}
        onConfirm={handleRemovalConfirm}
      />

      <BottomNavigation currentPage="meals" />
    </div>
  );
};

export default Meals;
