import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useRecipeStore } from '@/stores/recipeStore';
import { RecipeDto } from '@/services/recipeService';
import { RecipeSelector } from '@/components/RecipeSelector';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '@/utils/dateFormatting';

interface AddMealPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  preselectedRecipe?: RecipeDto;
  preselectedMealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  preselectedServings?: number;
}

export const AddMealPlanDialog = ({
  isOpen,
  onClose,
  selectedDate,
  preselectedRecipe,
  preselectedMealType = 'lunch',
  preselectedServings = 1
}: AddMealPlanDialogProps) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { toast } = useToast();
  const { createMealPlan, savingMealPlan } = useMealPlanStore();
  const { recipes, fetchRecipes, loading: recipesLoading } = useRecipeStore();
  
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDto | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [selectedServings, setSelectedServings] = useState(1);
  const [selectedDateInput, setSelectedDateInput] = useState('');

  // Fetch recipes when dialog opens
  useEffect(() => {
    if (isOpen && preselectedRecipe === undefined) {
      fetchRecipes();
    }
  }, [isOpen, fetchRecipes]);

  // Initialize form with preselected values
  useEffect(() => {
    if (isOpen) {
      setSelectedRecipe(preselectedRecipe || null);
      setSelectedMealType(preselectedMealType);
      setSelectedServings(preselectedServings);
      // Set default date input if no preselected date
      if (!selectedDate) {
        setSelectedDateInput(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, preselectedRecipe, preselectedMealType, preselectedServings, selectedDate]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedRecipe(null);
      setSelectedMealType('lunch');
      setSelectedServings(1);
      setSelectedDateInput('');
    }
  }, [isOpen]);

  const onRecipeSelect = (recipe: RecipeDto) => {
    setSelectedRecipe(recipe);
    setSelectedServings(recipe.servings || 1);
  };

  const handleSaveMeal = async () => {
    const dateToUse = selectedDate || (selectedDateInput ? new Date(selectedDateInput) : null);
    
    if (!dateToUse || !selectedMealType || !selectedRecipe) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.selectDateMealTypeRecipe'),
        variant: "destructive",
      });
      return;
    }

    try {
      // Use format from date-fns to avoid timezone issues
      const formattedDate = format(dateToUse, 'yyyy-MM-dd');
      
      await createMealPlan({
        date: formattedDate,
        mealType: selectedMealType,
        servings: selectedServings,
        recipeId: selectedRecipe.id,
      });

      onClose();
      toast({
        title: t('pages.mealPlans.mealPlanAdded'),
        description: t('pages.mealPlans.mealPlanSaved'),
      });
    } catch (error) {
      console.error('Error creating meal plan:', error);
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.failedToCreateMealPlan'),
        variant: "destructive",
      });
    }
  };

  // Convert RecipeListDto to RecipeDto format expected by RecipeSelector
  const convertedRecipes: RecipeDto[] = recipes.map(recipe => ({
    id: recipe.id,
    title: recipe.title,
    description: recipe.description || '',
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    totalTime: recipe.totalTime || recipe.prepTime + recipe.cookTime,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    instructions: [],
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    imageUrl: recipe.imageUrl,
    sourceUrl: recipe.sourceUrl,
    isFavorite: recipe.isFavorite,
    householdId: '',
    createdBy: recipe.createdBy,
    createdAt: recipe.createdAt,
    updatedAt: recipe.createdAt,
    ingredients: [],
    creator: recipe.creator ? {
      id: recipe.creator.id,
      displayName: recipe.creator.displayName,
      email: ''
    } : undefined
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('pages.mealPlans.addMealPlan')}</DialogTitle>
          <DialogDescription>
            {selectedDate ? t('pages.mealPlans.addMealFor') + ' ' + formatDate(selectedDate, 'EEEE, MMMM d') : ''}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
        {/* Show preselected recipe if it exists or show recipe selector */}
          {preselectedRecipe ? (
            <div className="bg-gray-50 p-3 rounded-lg bg-primary/10">
              <div className="font-medium">{preselectedRecipe.title}</div>
              <div className="text-sm text-muted-foreground">
                {t('addMealPlan.defaultServings', { servings: preselectedRecipe.servings })} • {(preselectedRecipe.prepTime || 0) + (preselectedRecipe.cookTime || 0)} min
              </div>
            </div>
            ) : (
            <div>
              <label className="block text-sm font-medium mb-2">{t('pages.mealPlans.recipe')}</label>
              <RecipeSelector
                onRecipeSelect={onRecipeSelect}
                selectedRecipe={selectedRecipe}
                recipes={convertedRecipes}
                loading={recipesLoading}
                placeholder={t('pages.mealPlans.searchRecipe')}
              />
            </div>
            )}

          {/* Show date input only if no preselected date */}
          {!selectedDate && (
            <div>
              <label className="block text-sm font-medium mb-2">{t('addMealPlan.date')}</label>
              <Input
                type="date"
                value={selectedDateInput}
                onChange={(e) => setSelectedDateInput(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">{t('pages.mealPlans.mealType')}</label>
            <Select value={selectedMealType} onValueChange={(value) => setSelectedMealType(value as 'breakfast' | 'lunch' | 'dinner' | 'snack')}>
              <SelectTrigger>
                <SelectValue placeholder={t('pages.mealPlans.selectMealType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">{t('pages.mealPlans.mealTypes.breakfast')}</SelectItem>
                <SelectItem value="lunch">{t('pages.mealPlans.mealTypes.lunch')}</SelectItem>
                <SelectItem value="dinner">{t('pages.mealPlans.mealTypes.dinner')}</SelectItem>
                <SelectItem value="snack">{t('pages.mealPlans.mealTypes.snack')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('pages.recipes.servings')}</label>
            <Select value={selectedServings.toString()} onValueChange={(value) => setSelectedServings(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder={t('pages.mealPlans.selectServings')} />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? t('pages.mealPlans.serving') : t('pages.mealPlans.servings')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('buttons.cancel')}
          </Button>
          <Button 
            onClick={handleSaveMeal}
            disabled={!selectedRecipe || !selectedMealType || savingMealPlan}
            className="bg-green-600 hover:bg-green-700 text-white mb-4"
          >
            {savingMealPlan ? t('forms.adding') : t('pages.mealPlans.addMeal')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};