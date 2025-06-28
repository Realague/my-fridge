
import React, { useState, useEffect } from 'react';
import { format, isToday, isSameMonth, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, ShoppingCart } from 'lucide-react';
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
import { useShoppingStore } from '@/stores/shoppingStore';
import { RecipeListDto, RecipeDto } from '@/services/recipeService';
import { RecipeSelector } from '@/components/RecipeSelector';
import BottomNavigation from '@/components/BottomNavigation';

interface MealPlanForm {
  date: Date | undefined;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  recipeId: string;
}

const MealPlans = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState<Date[]>(getWeekDays(currentDate));
  const [isAddMealDialogOpen, setIsAddMealDialogOpen] = useState(false);
  const [isViewMealPlanDialogOpen, setIsViewMealPlanDialogOpen] = useState(false);
  const [isGenerateShoppingListDialogOpen, setIsGenerateShoppingListDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [selectedServings, setSelectedServings] = useState(1);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDto | null>(null);
  const [viewingMealPlan, setViewingMealPlan] = useState<any>(null);
  const [shoppingListDateRange, setShoppingListDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const { mealPlans, fetchMealPlans, createMealPlan, deleteMealPlan, loading: mealPlansLoading, savingMealPlan, deletingMealPlan } = useMealPlanStore();
  const { recipes, fetchRecipes, loading: recipesLoading } = useRecipeStore();
  const { createShoppingItem } = useShoppingStore();
  const { toast } = useToast();

  useEffect(() => {
    setWeekDays(getWeekDays(currentDate));
  }, [currentDate]);

  useEffect(() => {
    const householdId = localStorage.getItem('householdId') || 'default';
    fetchMealPlans();
    fetchRecipes(householdId);
  }, [fetchMealPlans, fetchRecipes]);

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
        title: "Meal plan deleted!",
        description: "The meal plan has been removed.",
      });
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      toast({
        title: "Error",
        description: "Failed to delete meal plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateShoppingList = async () => {
    if (!shoppingListDateRange.from || !shoppingListDateRange.to) {
      toast({
        title: "Error",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }

    try {
      const householdId = localStorage.getItem('householdId') || 'default';
      
      // Get meal plans within the date range
      const startDate = format(shoppingListDateRange.from, 'yyyy-MM-dd');
      const endDate = format(shoppingListDateRange.to, 'yyyy-MM-dd');
      
      const relevantMealPlans = mealPlans.filter(plan => {
        const planDate = format(new Date(plan.plannedFor), 'yyyy-MM-dd');
        return planDate >= startDate && planDate <= endDate;
      });

      if (relevantMealPlans.length === 0) {
        toast({
          title: "No meal plans found",
          description: "No meal plans found for the selected date range.",
          variant: "destructive",
        });
        return;
      }

      // Group ingredients by item and calculate total quantities needed
      const ingredientTotals = new Map<string, {
        name: string;
        quantity: number;
        unit: string;
        recipes: string[];
      }>();

      relevantMealPlans.forEach(mealPlan => {
        const recipe = recipes.find(r => r.id === mealPlan.recipeId);
        if (!recipe || !recipe.ingredients) return;

        recipe.ingredients.forEach(ingredient => {
          const key = ingredient.itemId;
          const neededQuantity = parseFloat(ingredient.quantity.toString()) * mealPlan.servings;
          
          if (ingredientTotals.has(key)) {
            const existing = ingredientTotals.get(key)!;
            existing.quantity += neededQuantity;
            existing.recipes.push(recipe.title);
          } else {
            ingredientTotals.set(key, {
              name: ingredient.item?.name || 'Unknown Item',
              quantity: neededQuantity,
              unit: ingredient.unit,
              recipes: [recipe.title]
            });
          }
        });
      });

      // Create shopping items for each ingredient
      let addedCount = 0;
      for (const [itemId, data] of ingredientTotals) {
        try {
          await createShoppingItem(householdId, {
            itemId,
            quantity: data.quantity.toString(),
            unit: data.unit,
            priority: 0
          });
          addedCount++;
        } catch (error) {
          console.error(`Failed to add ${data.name} to shopping list:`, error);
        }
      }

      setIsGenerateShoppingListDialogOpen(false);
      toast({
        title: "Shopping list generated!",
        description: `Added ${addedCount} items to your shopping list from ${relevantMealPlans.length} meal plans.`,
      });

    } catch (error) {
      console.error('Error generating shopping list:', error);
      toast({
        title: "Error",
        description: "Failed to generate shopping list. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveMeal = async () => {
    if (!selectedDate || !selectedMealType || !selectedRecipe) {
      toast({
        title: "Error",
        description: "Please select a date, meal type, and recipe.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMealPlan({
        plannedFor: selectedDate.toISOString(),
        mealType: selectedMealType,
        servings: selectedServings,
        recipeId: selectedRecipe.id,
      });

      setIsAddMealDialogOpen(false);
      setSelectedRecipe(null);
      toast({
        title: "Meal plan added!",
        description: "Your meal plan has been saved.",
      });
    } catch (error) {
      console.error('Error creating meal plan:', error);
      toast({
        title: "Error",
        description: "Failed to create meal plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMealPlan = async (mealPlanId: string) => {
    try {
      await deleteMealPlan(mealPlanId);
      setIsViewMealPlanDialogOpen(false);
      toast({
        title: "Meal plan deleted!",
        description: "The meal plan has been removed.",
      });
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      toast({
        title: "Error",
        description: "Failed to delete meal plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Convert RecipeListDto to RecipeDto format expected by RecipeSelector
  const convertedRecipes: RecipeDto[] = recipes.map(recipe => ({
    ...recipe,
    instructions: recipe.description ? [recipe.description] : [],
    householdId: '',
    updatedAt: recipe.createdAt,
    ingredients: [],
    creator: recipe.creator ? {
      ...recipe.creator,
      email: ''
    } : undefined
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Meal Plans</h1>
            <Button
              onClick={() => setIsGenerateShoppingListDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Generate Shopping List
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
                  Today
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
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
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
                            {mealPlan.recipe.title}
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              {mealPlan.mealType}
                            </Badge>
                            {mealPlan.servings > 1 && (
                              <span className="text-xs text-gray-600">
                                {mealPlan.servings}
                              </span>
                            )}
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
                    Add Meal
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Shopping List Dialog */}
        <Dialog open={isGenerateShoppingListDialogOpen} onOpenChange={setIsGenerateShoppingListDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Shopping List</DialogTitle>
              <DialogDescription>
                Select a date range to generate a shopping list from your meal plans
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <Calendar
                  mode="single"
                  selected={shoppingListDateRange.from}
                  onSelect={(date) => setShoppingListDateRange(prev => ({ ...prev, from: date }))}
                  className="rounded-md border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <Calendar
                  mode="single"
                  selected={shoppingListDateRange.to}
                  onSelect={(date) => setShoppingListDateRange(prev => ({ ...prev, to: date }))}
                  className="rounded-md border"
                  disabled={(date) => 
                    shoppingListDateRange.from ? date < shoppingListDateRange.from : false
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateShoppingListDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateShoppingList}
                disabled={!shoppingListDateRange.from || !shoppingListDateRange.to}
                className="bg-green-600 hover:bg-green-700"
              >
                Generate List
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
                  <DialogTitle>{viewingMealPlan.recipe.title}</DialogTitle>
                  <DialogDescription>
                    {format(new Date(viewingMealPlan.plannedFor), 'EEEE, MMMM d')} • {viewingMealPlan.mealType}
                    {viewingMealPlan.servings > 1 && ` • ${viewingMealPlan.servings} servings`}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-gray-600">{viewingMealPlan.recipe.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Prep Time:</span> {viewingMealPlan.recipe.prepTime} min
                    </div>
                    <div>
                      <span className="font-medium">Cook Time:</span> {viewingMealPlan.recipe.cookTime} min
                    </div>
                    <div>
                      <span className="font-medium">Difficulty:</span> {viewingMealPlan.recipe.difficulty}
                    </div>
                    <div>
                      <span className="font-medium">Recipe Servings:</span> {viewingMealPlan.recipe.servings}
                    </div>
                  </div>
                  
                  {viewingMealPlan.recipe.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Tags</h4>
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
                    Close
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleDeleteMealPlan(viewingMealPlan.id)}
                    disabled={deletingMealPlan}
                  >
                    {deletingMealPlan ? 'Deleting..' : 'Delete'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <BottomNavigation currentPage="meal-plans" />
    </div>
  );
};

export default MealPlans;
