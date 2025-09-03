import React, { useState, useEffect } from 'react';
import { format, isToday, isSameMonth, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, ExternalLink, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast"
import { getWeekDays, getMealPlansForDay, MealPlan } from '@/utils/mealPlanHelpers';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useRecipeStore } from '@/stores/recipeStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { RecipeListDto, RecipeDto } from '@/services/recipeService';
import { RecipeSelector } from '@/components/RecipeSelector';
import BottomNavigation from '@/components/BottomNavigation';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useTranslation } from 'react-i18next';

interface MealPlanForm {
  date: Date | undefined;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  recipeId: string;
}

const MealPlans = () => {
  const { t } = useTranslation();
  // Protected route hook handles auth and household checks
  const { selectedHouseholdId } = useProtectedRoute();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>(getWeekDays(currentDate));
  const [isAddMealDialogOpen, setIsAddMealDialogOpen] = useState(false);
  const [isViewMealPlanDialogOpen, setIsViewMealPlanDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [selectedServings, setSelectedServings] = useState(1);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDto | null>(null);
  const [viewingMealPlan, setViewingMealPlan] = useState<any>(null);
  const [isGenerateShoppingListDialogOpen, setIsGenerateShoppingListDialogOpen] = useState(false);
  const [shoppingListDateRange, setShoppingListDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: weekDays[0],
    to: weekDays[6]
  });
  const { mealPlans, fetchMealPlans, fetchMealPlansByDateRange, createMealPlan, deleteMealPlan, generateShoppingList: generateShoppingListFromStore, loading: mealPlansLoading, savingMealPlan, deletingMealPlan } = useMealPlanStore();
  const { recipes, fetchRecipes, loading: recipesLoading } = useRecipeStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const newWeekDays = getWeekDays(currentDate);
    setWeekDays(newWeekDays);
    // Update shopping list date range to match the current viewed week
    setShoppingListDateRange({
      from: newWeekDays[0],
      to: newWeekDays[6]
    });
  }, [currentDate]);

  useEffect(() => {
    if (selectedHouseholdId) {
      fetchRecipes(selectedHouseholdId);
    }
  }, [fetchRecipes, selectedHouseholdId]);

  // Fetch meal plans when the current date (viewed week) changes
  useEffect(() => {
    if (selectedHouseholdId && weekDays.length > 0) {
      const startDate = format(weekDays[0], 'yyyy-MM-dd');
      const endDate = format(weekDays[6], 'yyyy-MM-dd');
      console.log('Fetching meal plans for week:', startDate, 'to', endDate);
      fetchMealPlansByDateRange(selectedHouseholdId, startDate, endDate);
    }
  }, [fetchMealPlansByDateRange, selectedHouseholdId, weekDays]);

  const getMealPlansForDay = (day: Date): MealPlan[] => {
    return mealPlans.filter(plan => 
      format(new Date(plan.plannedFor), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );
  };

  const handleAddMeal = (day: Date) => {
    setSelectedDate(day);
    setIsAddMealDialogOpen(true);
  };

  const handleViewMealPlan = (mealPlan: MealPlan) => {
    setViewingMealPlan(mealPlan);
    setIsViewMealPlanDialogOpen(true);
  };

  const handleQuickDeleteMealPlan = async (e: React.MouseEvent, mealPlanId: string) => {
    e.stopPropagation(); // Prevent opening the meal plan dialog
    
    try {
      await deleteMealPlan(mealPlanId);
      toast({
        title: t('pages.mealPlans.mealPlanDeleted'),
        description: t('pages.mealPlans.mealPlanRemoved'),
      });
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.failedToDeleteMealPlan'),
        variant: "destructive",
      });
    }
  };

  const handleSaveMeal = async () => {
    if (!selectedDate || !selectedMealType || !selectedRecipe) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.selectDateMealTypeRecipe'),
        variant: "destructive",
      });
      return;
    }

    try {
      // Use format from date-fns to avoid timezone issues
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      await createMealPlan({
        date: formattedDate,
        mealType: selectedMealType,
        servings: selectedServings,
        recipeId: selectedRecipe.id,
      });

      setIsAddMealDialogOpen(false);
      setSelectedRecipe(null);
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

  const handleDeleteMealPlan = async (mealPlanId: string) => {
    try {
      await deleteMealPlan(mealPlanId);
      setIsViewMealPlanDialogOpen(false);
      toast({
        title: t('pages.mealPlans.mealPlanDeleted'),
        description: t('pages.mealPlans.mealPlanRemoved'),
      });
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.failedToDeleteMealPlan'),
        variant: "destructive",
      });
    }
  };

  const handleViewRecipe = (recipeId: string) => {
    navigate(`/recipes/${recipeId}`);
  };

  const generateShoppingList = () => {
    // Set default date range to current week when opening dialog
    setShoppingListDateRange({
      from: weekDays[0],
      to: weekDays[6]
    });
    setIsGenerateShoppingListDialogOpen(true);
  };

  const handleGenerateShoppingList = async () => {
    if (!shoppingListDateRange.from || !shoppingListDateRange.to || !selectedHouseholdId) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.selectBothDates'),
        variant: "destructive",
      });
      return;
    }

    try {
      const startDate = format(shoppingListDateRange.from, 'yyyy-MM-dd');
      const endDate = format(shoppingListDateRange.to, 'yyyy-MM-dd');
      
      const shoppingList = await generateShoppingListFromStore(startDate, endDate, selectedHouseholdId);
      
      setIsGenerateShoppingListDialogOpen(false);
      
      // Navigate to shopping page to view the newly created items
      navigate('/shopping');
      
      toast({
        title: t('messages.success.shoppingListGenerated'),
        description: t('messages.shoppingListGeneratedDescription', { 
          count: shoppingList.length, 
          dateRange: `${format(shoppingListDateRange.from, 'MMM d')} - ${format(shoppingListDateRange.to, 'MMM d')}`
        }),
      });
    } catch (error) {
      console.error('Error generating shopping list:', error);
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.failedToGenerateShoppingList'),
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
    instructions: [], // RecipeListDto doesn't have instructions
    tags: Array.isArray(recipe.tags) ? recipe.tags : [], // Ensure tags is always an array
    image: recipe.image,
    isFavorite: recipe.isFavorite,
    householdId: selectedHouseholdId || '',
    createdBy: recipe.createdBy,
    createdAt: recipe.createdAt,
    updatedAt: recipe.createdAt,
    ingredients: [], // RecipeListDto doesn't have ingredients
    creator: recipe.creator ? {
      id: recipe.creator.id,
      displayName: recipe.creator.displayName,
      email: '' // RecipeListDto creator doesn't have email
    } : undefined
  }));

  console.log('MealPlans - recipes:', recipes?.length);
  console.log('MealPlans - convertedRecipes:', convertedRecipes?.length);
  console.log('MealPlans - recipesLoading:', recipesLoading);

  // Show message if no household is selected
  if (!selectedHouseholdId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 pb-20">
        <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.mealPlans.title')}</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('pages.auth.noHouseholdSelected')}</h2>
            <p className="text-gray-600 mb-6">{t('pages.auth.selectHouseholdFirst')} meal plans.</p>
            <Button onClick={() => window.location.href = '/household'} className="bg-green-600 hover:bg-green-700">
              {t('pages.auth.goToHouseholdSettings')}
            </Button>
          </div>
        </div>
        <BottomNavigation currentPage="mealplans" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">{t('pages.mealPlans.title')}</h1>
            <Button
              onClick={() => generateShoppingList()}
              className="bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {t('pages.mealPlans.generateShoppingList')}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Calendar Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
                  className="text-gray-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  className="text-gray-600"
                >
                  {t('pages.mealPlans.today')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                  className="text-gray-600"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-7 gap-2">
              {[t('pages.mealPlans.mon'), t('pages.mealPlans.tue'), t('pages.mealPlans.wed'), t('pages.mealPlans.thu'), t('pages.mealPlans.fri'), t('pages.mealPlans.sat'), t('pages.mealPlans.sun')].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                  {day}
                </div>
              ))}
              
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[120px] p-2 border border-gray-200 rounded-lg
                    ${!isSameMonth(day, currentDate) ? 'opacity-50 bg-gray-50' : 'bg-white'}
                    ${isToday(day) ? 'ring-2 ring-green-500' : ''}
                  `}
                >
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    {format(day, 'd')}
                  </div>
                  
                  {/* Meal Plans for this day */}
                  <div className="space-y-1">
                    {getMealPlansForDay(day).map((mealPlan) => (
                      <Card
                        key={mealPlan.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border-0 bg-gradient-to-r from-green-50 to-orange-50 group relative"
                        onClick={() => handleViewMealPlan(mealPlan)}
                      >
                        <CardContent className="p-2">
                          <div className="text-xs font-medium text-gray-900 truncate mb-1">
                            {mealPlan.recipe?.title || 'Recipe not found'}
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              {mealPlan.mealType}
                            </Badge>
                              <span className="text-xs text-gray-600">
                                {mealPlan.servings}
                              </span>
                          </div>
                        </CardContent>
                        
                        {/* Quick Delete Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleQuickDeleteMealPlan(e, mealPlan.id)}
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 text-red-600"
                          disabled={deletingMealPlan}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Add Meal Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddMeal(day)}
                    className="w-full mt-2 text-xs text-gray-500 hover:text-green-600 hover:bg-green-50"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t('pages.mealPlans.addMeal')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add Meal Dialog */}
        <Dialog open={isAddMealDialogOpen} onOpenChange={setIsAddMealDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('pages.mealPlans.addMealPlan')}</DialogTitle>
              <DialogDescription>
                {t('pages.mealPlans.addMealFor')} {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : ''}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('pages.mealPlans.recipe')}</label>
                <RecipeSelector
                  onRecipeSelect={(recipe) => setSelectedRecipe(recipe)}
                  selectedRecipe={selectedRecipe}
                  recipes={convertedRecipes}
                  loading={recipesLoading}
                  placeholder={t('pages.mealPlans.searchRecipe')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('pages.mealPlans.mealType')}</label>
                <Select value={selectedMealType} onValueChange={(value) => setSelectedMealType(value as 'breakfast' | 'lunch' | 'dinner' | 'snack')}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('pages.mealPlans.selectMealType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">{t('pages.mealPlans.breakfast')}</SelectItem>
                    <SelectItem value="lunch">{t('pages.mealPlans.lunch')}</SelectItem>
                    <SelectItem value="dinner">{t('pages.mealPlans.dinner')}</SelectItem>
                    <SelectItem value="snack">{t('pages.mealPlans.snack')}</SelectItem>
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
                        {num} {num === 1 ? 'serving' : 'servings'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddMealDialogOpen(false)}>
                {t('buttons.cancel')}
              </Button>
              <Button 
                onClick={handleSaveMeal}
                disabled={!selectedRecipe || !selectedMealType || savingMealPlan}
                className="bg-green-600 hover:bg-green-700"
              >
                {savingMealPlan ? t('forms.adding') : t('pages.mealPlans.addMeal')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Meal Plan Dialog */}
        <Dialog open={isViewMealPlanDialogOpen} onOpenChange={setIsViewMealPlanDialogOpen}>
          <DialogContent className="max-w-md">
            {viewingMealPlan && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {viewingMealPlan.recipe ? (
                      <Button
                        variant="link"
                        className="p-0 h-auto text-left text-lg font-semibold text-gray-900 hover:text-green-600"
                        onClick={() => handleViewRecipe(viewingMealPlan.recipe.id)}
                      >
                        {viewingMealPlan.recipe.title}
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      'Recipe not found'
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    {format(new Date(viewingMealPlan.plannedFor), 'EEEE, MMMM d')} • {viewingMealPlan.mealType}
                    {` • ${viewingMealPlan.servings} servings`}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {viewingMealPlan.recipe?.description && (
                    <div>
                      <h4 className="font-medium mb-2">{t('pages.recipes.description')}</h4>
                      <p className="text-sm text-gray-600">{viewingMealPlan.recipe.description}</p>
                    </div>
                  )}
                  
                  {viewingMealPlan.recipe && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">{t('pages.recipes.prepTime')}:</span> {viewingMealPlan.recipe.prepTime} min
                      </div>
                      <div>
                        <span className="font-medium">{t('pages.recipes.cookTime')}:</span> {viewingMealPlan.recipe.cookTime} min
                      </div>
                      <div>
                        <span className="font-medium">{t('pages.recipes.difficulty')}:</span> {viewingMealPlan.recipe.difficulty}
                      </div>
                      <div>
                        <span className="font-medium">{t('pages.recipes.servings')}:</span> {viewingMealPlan.recipe.servings}
                      </div>
                    </div>
                  )}
                  
                  {viewingMealPlan.recipe?.tags && viewingMealPlan.recipe.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">{t('pages.recipes.tags')}</h4>
                      <div className="flex flex-wrap gap-1">
                        {viewingMealPlan.recipe.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewMealPlanDialogOpen(false)}>
                    {t('buttons.close')}
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleDeleteMealPlan(viewingMealPlan.id)}
                    disabled={deletingMealPlan}
                  >
                    {deletingMealPlan ? t('buttons.delete')+'...' : t('buttons.delete')}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Generate Shopping List Dialog */}
        <Dialog open={isGenerateShoppingListDialogOpen} onOpenChange={setIsGenerateShoppingListDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('pages.mealPlans.generateShoppingListDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('pages.mealPlans.generateShoppingListDialog.description')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('pages.mealPlans.generateShoppingListDialog.selectDateRange')}
                  {shoppingListDateRange.from && shoppingListDateRange.to && (
                    <span className="text-sm text-gray-600 ml-2">
                      ({format(shoppingListDateRange.from, 'MMM d')} - {format(shoppingListDateRange.to, 'MMM d')})
                    </span>
                  )}
                </label>
                <Calendar
                  mode="range"
                  selected={shoppingListDateRange}
                  onSelect={(range) => setShoppingListDateRange({ from: range?.from, to: range?.to })}
                  className="rounded-md border pointer-events-auto"
                  numberOfMonths={1}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateShoppingListDialogOpen(false)}>
                {t('buttons.cancel')}
              </Button>
              <Button 
                onClick={handleGenerateShoppingList}
                disabled={!shoppingListDateRange.from || !shoppingListDateRange.to}
                className="bg-green-600 hover:bg-green-700"
              >
                {t('pages.mealPlans.generateShoppingList')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <BottomNavigation currentPage="meal-plans" />
    </div>
  );
};

export default MealPlans;
