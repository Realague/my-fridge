
import React, { useState, useEffect } from 'react';
import { format, isToday, isSameMonth, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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
import { RecipeListDto, RecipeDto } from '@/services/recipeService';
import { RecipeSelector } from '@/components/RecipeSelector';

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [selectedServings, setSelectedServings] = useState(1);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDto | null>(null);
  const [viewingMealPlan, setViewingMealPlan] = useState<any>(null);
  const { mealPlans, fetchMealPlans, createMealPlan, deleteMealPlan, loading: mealPlansLoading, savingMealPlan, deletingMealPlan } = useMealPlanStore();
  const { recipes, fetchRecipes, loading: recipesLoading } = useRecipeStore();
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Meal Plans</h1>
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
                        className="cursor-pointer hover:shadow-md transition-shadow border-0 bg-gradient-to-r from-green-50 to-orange-50"
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

        {/* Add Meal Dialog */}
        <Dialog open={isAddMealDialogOpen} onOpenChange={setIsAddMealDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Meal Plan</DialogTitle>
              <DialogDescription>
                Add a meal for {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : ''}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipe</label>
                <RecipeSelector
                  onRecipeSelect={(recipe) => setSelectedRecipe(recipe)}
                  selectedRecipe={selectedRecipe}
                  recipes={convertedRecipes}
                  loading={recipesLoading}
                  placeholder="Search for a recipe..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Meal Type</label>
                <Select value={selectedMealType} onValueChange={(value) => setSelectedMealType(value as 'breakfast' | 'lunch' | 'dinner' | 'snack')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Servings</label>
                <Select value={selectedServings.toString()} onValueChange={(value) => setSelectedServings(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select servings" />
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
                Cancel
              </Button>
              <Button 
                onClick={handleSaveMeal}
                disabled={!selectedRecipe || !selectedMealType || savingMealPlan}
                className="bg-green-600 hover:bg-green-700"
              >
                {savingMealPlan ? 'Adding...' : 'Add Meal'}
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
    </div>
  );
};

export default MealPlans;
