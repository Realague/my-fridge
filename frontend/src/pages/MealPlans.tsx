import React, { useState, useEffect } from 'react';
import { format, isToday, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, ExternalLink, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast"
import { getWeekDays, MealPlan } from '@/utils/mealPlanHelpers';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { AddMealPlanDialog } from '@/components/AddMealPlanDialog';
import BottomNavigation from '@/components/BottomNavigation';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useDateFormat } from '@/utils/dateFormatting';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';

const MealPlans = () => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const isMobile = useIsMobile();
  // Protected route hook handles auth and household checks
  const { selectedHouseholdId } = useProtectedRoute();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>(getWeekDays(currentDate));
  const [isAddMealDialogOpen, setIsAddMealDialogOpen] = useState(false);
  const [isViewMealPlanDialogOpen, setIsViewMealPlanDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewingMealPlan, setViewingMealPlan] = useState<any>(null);
  const [isGenerateShoppingListDialogOpen, setIsGenerateShoppingListDialogOpen] = useState(false);
  const [shoppingListDateRange, setShoppingListDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: weekDays[0],
    to: weekDays[6]
  });
  const { mealPlans, fetchMealPlansByDateRange, deleteMealPlan, generateShoppingList: generateShoppingListFromStore, loading: mealPlansLoading, deletingMealPlan } = useMealPlanStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Helper function to get the week label
  const getWeekLabel = () => {
    // Show date range for non-current weeks
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    
    // Format as DD/MM/YYYY-DD/MM/YYYY
    const startFormatted = format(weekStart, 'dd/MM/yyyy');
    const endFormatted = format(weekEnd, 'dd/MM/yyyy');
    
    return `${startFormatted}-${endFormatted}`;
  };

  useEffect(() => {
    const newWeekDays = getWeekDays(currentDate);
    setWeekDays(newWeekDays);
    // Update shopping list date range to match the current viewed week
    setShoppingListDateRange({
      from: newWeekDays[0],
      to: newWeekDays[6]
    });
  }, [currentDate]);


  // Fetch meal plans when the current date (viewed week) changes
  useEffect(() => {
    if (selectedHouseholdId && weekDays.length > 0) {
      const startDate = format(weekDays[0], 'yyyy-MM-dd');
      const endDate = format(weekDays[6], 'yyyy-MM-dd');
      fetchMealPlansByDateRange(startDate, endDate);
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
      
      const shoppingList = await generateShoppingListFromStore(startDate, endDate);
      
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

  // Show message if no household is selected
  if (!selectedHouseholdId) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-foreground">{t('pages.mealPlans.title')}</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 p-8 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-4">{t('pages.auth.noHouseholdSelected')}</h2>
            <p className="text-muted-foreground mb-6">{t('pages.auth.selectHouseholdFirst')} meal plans.</p>
            <Button onClick={() => window.location.href = '/household'} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {t('pages.auth.goToHouseholdSettings')}
            </Button>
          </div>
        </div>
        <BottomNavigation currentPage="mealplans" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className={`flex items-center ${isMobile ? 'flex-col gap-3' : 'justify-between'}`}>
            <h1 className={`font-bold text-foreground ${isMobile ? 'text-xl text-center' : 'text-2xl'}`}>{t('pages.mealPlans.title')}</h1>
            <Button
              variant="green"
              onClick={() => generateShoppingList()}
              className={`touch-friendly ${isMobile ? 'w-full' : ''}`}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              {t('pages.mealPlans.generateShoppingList')}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Calendar Header */}
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-lg border-0 mb-6">
          <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`flex items-center ${isMobile ? 'flex-col gap-4' : 'justify-between'} mb-4`}>
              <h2 className={`font-semibold text-foreground ${isMobile ? 'text-lg text-center' : 'text-xl'}`}>
                {getWeekLabel()}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size={isMobile ? "default" : "sm"}
                  onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
                  className={`text-muted-foreground touch-friendly ${isMobile ? 'h-12 w-12' : ''}`}
                >
                  <ChevronLeft className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
                </Button>
                <Button
                  variant="outline"
                  size={isMobile ? "default" : "sm"}
                  onClick={() => setCurrentDate(new Date())}
                  className={`text-muted-foreground touch-friendly ${isMobile ? 'px-6' : 'px-4'} whitespace-nowrap text-xs`}
                >
                  {t('pages.mealPlans.currentWeek')}
                </Button>
                <Button
                  variant="outline"
                  size={isMobile ? "default" : "sm"}
                  onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                  className={`text-muted-foreground touch-friendly ${isMobile ? 'h-12 w-12' : ''}`}
                >
                  <ChevronRight className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
                </Button>
              </div>
            </div>

            {/* Mobile and Desktop Views */}
            {isMobile ? (
              // Mobile: Vertical card layout
              <div className="space-y-4">
                {weekDays.map((day) => (
                  <Card
                    key={day.toISOString()}
                    className={`
                      border border-border 
                      ${new Date() > new Date(day) && !isToday(day) ? 'opacity-50 bg-muted' : 'bg-card'}
                      ${isToday(day) ? 'ring-2 ring-primary bg-primary/5' : ''}
                    `}
                  >
                    <CardContent className="p-4">
                      {/* Day Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold text-foreground">
                            {format(day, 'd')}
                          </div>
                          <div className="text-sm font-medium text-muted-foreground">
                            {formatDate(day, 'EEEE').toLowerCase()}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={new Date() > new Date(day) && !isToday(day)}
                          onClick={() => handleAddMeal(day)}
                          className="touch-friendly bg-primary/10 hover:bg-primary/20 border-primary/20"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('pages.mealPlans.addMeal')}
                        </Button>
                      </div>
                      
                      {/* Meal Plans for this day */}
                      <div className="space-y-3">
                        {getMealPlansForDay(day).length === 0 ? (
                          <div className="text-sm text-muted-foreground italic py-2">
                            {t('pages.mealPlans.noMealsPlanned')}
                          </div>
                        ) : (
                          getMealPlansForDay(day).map((mealPlan) => (
                            <Card
                              key={mealPlan.id}
                              className="cursor-pointer hover:shadow-md transition-all border-0 bg-primary/5 group"
                              onClick={() => handleViewMealPlan(mealPlan)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-foreground truncate mb-1">
                                      {mealPlan.recipe?.title || 'Recipe not found'}
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {t(`pages.mealPlans.mealTypes.${mealPlan.mealType}`)}
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {mealPlan.servings} {t('pages.mealPlans.servings')}
                                      </span>
                                    </div>
                                    {mealPlan.recipe && (
                                      <div className="text-xs text-muted-foreground">
                                        {mealPlan.recipe.prepTime + mealPlan.recipe.cookTime} min • {mealPlan.recipe.difficulty}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleQuickDeleteMealPlan(e, mealPlan.id)}
                                    className="h-8 w-8 p-0 opacity-60 group-hover:opacity-100 transition-opacity bg-destructive/10 hover:bg-destructive/20 text-destructive touch-friendly"
                                    disabled={deletingMealPlan}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Desktop: Grid layout
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div key={day.toISOString()}>
                    <div className="text-center text-sm font-medium text-muted-foreground p-2">
                      {formatDate(day, 'EEEE')}
                    </div>
                    <div
                      className={`
                        min-h-[120px] p-2 border border-border rounded-lg
                        ${new Date() > new Date(day) && !isToday(day) ? 'opacity-50 bg-muted' : 'bg-card'}
                        ${isToday(day) ? 'ring-2 ring-primary' : ''}
                      `}
                    >
                    <div className="text-sm font-medium text-foreground mb-2">
                      {format(day, 'd')}
                    </div>
                    
                    {/* Meal Plans for this day */}
                    <div className="space-y-1">
                      {getMealPlansForDay(day).map((mealPlan) => (
                        <Card
                          key={mealPlan.id}
                          className="cursor-pointer hover:shadow-md transition-shadow border-0 bg-primary/5 group relative"
                          onClick={() => handleViewMealPlan(mealPlan)}
                        >
                          <CardContent className="p-2 bg-primary/10">
                            <div className="text-xs font-medium text-foreground truncate mb-1 ">
                              {mealPlan.recipe?.title || 'Recipe not found'}
                            </div>
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                {t(`pages.mealPlans.mealTypes.${mealPlan.mealType}`)}
                              </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {mealPlan.servings}
                                </span>
                            </div>
                          </CardContent>
                          
                          {/* Quick Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleQuickDeleteMealPlan(e, mealPlan.id)}
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/10 hover:bg-destructive/20 text-destructive"
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
                      disabled={new Date() > new Date(day) && !isToday(day)}
                      onClick={() => handleAddMeal(day)}
                      className="w-full mt-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t('pages.mealPlans.addMeal')}
                    </Button>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Meal Dialog */}
        <AddMealPlanDialog
          isOpen={isAddMealDialogOpen}
          onClose={() => setIsAddMealDialogOpen(false)}
          selectedDate={selectedDate}
        />

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
                        className="p-0 h-auto text-left text-lg font-semibold text-foreground hover:text-primary"
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
                    {formatDate(new Date(viewingMealPlan.plannedFor), 'EEEE, MMMM d')} • {t(`pages.mealPlans.mealTypes.${viewingMealPlan.mealType}`)}
                    {` • ${viewingMealPlan.servings} servings`}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {viewingMealPlan.recipe?.description && (
                    <div>
                      <h4 className="font-medium mb-2">{t('pages.recipes.description')}</h4>
                      <p className="text-sm text-muted-foreground">{viewingMealPlan.recipe.description}</p>
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
                    <span className="text-sm text-muted-foreground ml-2">
                      ({formatDate(shoppingListDateRange.from, 'MMM d')} - {formatDate(shoppingListDateRange.to, 'MMM d')})
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
