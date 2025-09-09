import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useRecipes } from '@/contexts/RecipeContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Recipe {
  id: string;
  title: string;
  servings: number;
  prepTime: number;
  cookTime: number;
}

interface AddMealPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedRecipe?: Recipe;
  preselectedDate?: string;
  preselectedMealType?: 'breakfast' | 'lunch' | 'dinner';
}

export const AddMealPlanDialog = ({
  isOpen,
  onClose,
  preselectedRecipe,
  preselectedDate,
  preselectedMealType
}: AddMealPlanDialogProps) => {
  const { t } = useTranslation();
  const { addToMealPlan } = useMealPlan();
  const { recipes } = useRecipes();
  
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
  const [selectedServings, setSelectedServings] = useState(1);

  useEffect(() => {
    if (preselectedRecipe) {
      setSelectedRecipe(preselectedRecipe.id);
      setSelectedServings(preselectedRecipe.servings || 1);
    } else {
      setSelectedRecipe('');
      setSelectedServings(1);
    }
  }, [preselectedRecipe]);

  useEffect(() => {
    if (preselectedDate) {
      setSelectedDate(preselectedDate);
    }
  }, [preselectedDate]);

  useEffect(() => {
    if (preselectedMealType) {
      setSelectedMealType(preselectedMealType);
    }
  }, [preselectedMealType]);

  useEffect(() => {
    if (!isOpen) {
      if (!preselectedRecipe) {
        setSelectedRecipe('');
      }
      if (!preselectedDate) {
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }
      if (!preselectedMealType) {
        setSelectedMealType('lunch');
      }
      setSelectedServings(preselectedRecipe?.servings || 1);
    }
  }, [isOpen, preselectedRecipe, preselectedDate, preselectedMealType]);

  const handleAddMeal = () => {
    if (!selectedRecipe || !selectedDate || !selectedMealType) return;

    addToMealPlan(selectedRecipe, selectedDate, selectedMealType, selectedServings);
    
    const recipe = recipes.find(r => r.id === selectedRecipe);
    const recipeName = recipe?.title || preselectedRecipe?.title || 'Recipe';
    
    toast.success(t('pages.mealPlans.mealPlanAdded'), {
      description: t('addMealPlan.addedDescription', {
        recipeName,
        mealType: t(`pages.mealPlans.${selectedMealType}`),
        date: new Date(selectedDate).toLocaleDateString(),
        servings: selectedServings
      }),
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {preselectedRecipe ? t('addMealPlan.addToMealPlan') : t('addMealPlan.addRecipeToMealPlan')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {preselectedRecipe && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-medium">{preselectedRecipe.title}</div>
              <div className="text-sm text-gray-600">
                {t('addMealPlan.defaultServings', { servings: preselectedRecipe.servings })} • {(preselectedRecipe.prepTime || 0) + (preselectedRecipe.cookTime || 0)} min
              </div>
            </div>
          )}

          {!preselectedRecipe && (
            <div>
              <label className="text-sm font-medium block mb-1">{t('pages.mealPlans.recipe')}</label>
              <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
                <SelectTrigger>
                  <SelectValue placeholder={t('pages.mealPlans.searchRecipe')} />
                </SelectTrigger>
                <SelectContent>
                  {recipes.map((recipe) => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      <div className="flex flex-col items-start">
                        <span>{recipe.title}</span>
                        <span className="text-xs text-gray-500">
                          {recipe.servings} {t('pages.recipes.servings')} • {recipe.prepTime + recipe.cookTime} min
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium block mb-1">{t('addMealPlan.date')}</label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">{t('pages.mealPlans.mealType')}</label>
            <Select value={selectedMealType} onValueChange={(value: 'breakfast' | 'lunch' | 'dinner') => setSelectedMealType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">🌅 {t('pages.mealPlans.breakfast')}</SelectItem>
                <SelectItem value="lunch">☀️ {t('pages.mealPlans.lunch')}</SelectItem>
                <SelectItem value="dinner">🌙 {t('pages.mealPlans.dinner')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">{t('pages.recipes.servings')}</label>
            <Input
              type="number"
              min="1"
              max="20"
              value={selectedServings}
              onChange={(e) => setSelectedServings(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder={t('addMealPlan.numberOfServings')}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('buttons.cancel')}
            </Button>
            <Button 
              onClick={handleAddMeal} 
              disabled={!selectedRecipe} 
              className="flex-1"
            >
              {t('addMealPlan.addToMealPlan')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
