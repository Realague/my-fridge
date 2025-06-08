
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Clock, Users, ChefHat, Trash2, ShoppingCart } from 'lucide-react';
import BottomNavigation from '@/components/BottomNavigation';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useRecipes } from '@/contexts/RecipeContext';
import { useToast } from '@/hooks/use-toast';

const MealPlans = () => {
  const { mealPlans, addToMealPlan, removeMealPlan, getMealPlansForDate } = useMealPlan();
  const { recipes } = useRecipes();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Generate week dates starting from selected date
  const getWeekDates = (startDate: string) => {
    const dates = [];
    const start = new Date(startDate);
    const startOfWeek = new Date(start);
    startOfWeek.setDate(start.getDate() - start.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const weekDates = getWeekDates(selectedDate);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'] as const;

  const handleAddMeal = () => {
    if (selectedRecipe && selectedDate && selectedMealType) {
      addToMealPlan(selectedRecipe, selectedDate, selectedMealType);
      setShowAddDialog(false);
      setSelectedRecipe('');
      toast({
        title: "Meal added",
        description: "Recipe has been added to your meal plan.",
      });
    }
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      default: return '🍽️';
    }
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'bg-orange-100 text-orange-800';
      case 'lunch': return 'bg-blue-100 text-blue-800';
      case 'dinner': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Meal Plans
              </h1>
              <p className="text-sm text-gray-600">Plan your weekly meals</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Generate List
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Meal
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Recipe to Meal Plan</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Date</label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Meal Type</label>
                      <Select value={selectedMealType} onValueChange={(value: 'breakfast' | 'lunch' | 'dinner') => setSelectedMealType(value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                          <SelectItem value="lunch">☀️ Lunch</SelectItem>
                          <SelectItem value="dinner">🌙 Dinner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Recipe</label>
                      <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select a recipe" />
                        </SelectTrigger>
                        <SelectContent>
                          {recipes.map((recipe) => (
                            <SelectItem key={recipe.id} value={recipe.id}>
                              {recipe.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddMeal} disabled={!selectedRecipe} className="w-full">
                      Add to Meal Plan
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Week Navigation */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() - 7);
                  setSelectedDate(newDate.toISOString().split('T')[0]);
                }}
              >
                ← Previous Week
              </Button>
              <div className="text-center">
                <h2 className="font-semibold">
                  Week of {new Date(weekDates[0]).toLocaleDateString()}
                </h2>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 7);
                  setSelectedDate(newDate.toISOString().split('T')[0]);
                }}
              >
                Next Week →
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Meal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDates.map((date, index) => {
            const dayMealPlans = getMealPlansForDate(date);
            const isToday = date === new Date().toISOString().split('T')[0];
            
            return (
              <Card key={date} className={`bg-white/80 backdrop-blur-sm border-0 shadow-lg ${isToday ? 'ring-2 ring-green-500' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-center">
                    <div className="font-medium">{dayNames[index]}</div>
                    <div className="text-xs text-gray-600">
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mealTypes.map((mealType) => {
                    const mealPlan = dayMealPlans.find(plan => plan.mealType === mealType);
                    const recipe = mealPlan ? recipes.find(r => r.id === mealPlan.recipeId) : null;
                    
                    return (
                      <div key={mealType} className="min-h-[60px] border border-gray-200 rounded-lg p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs">{getMealTypeIcon(mealType)}</span>
                          <span className="text-xs font-medium capitalize">{mealType}</span>
                        </div>
                        {recipe ? (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-900 line-clamp-2">
                              {recipe.title}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Clock className="h-3 w-3" />
                                <span>{recipe.prepTime + recipe.cookTime}m</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => mealPlan && removeMealPlan(mealPlan.id)}
                                className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDate(date);
                              setSelectedMealType(mealType);
                              setShowAddDialog(true);
                            }}
                            className="w-full h-8 text-xs text-gray-500 hover:text-gray-700"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <BottomNavigation currentPage="meal-plans" />
    </div>
  );
};

export default MealPlans;
