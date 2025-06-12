import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Clock, Users, Heart, Edit, Calendar, Plus, ChefHat } from 'lucide-react';
import { useRecipes } from '@/contexts/RecipeContext';
import { useMealPlan } from '@/contexts/MealPlanContext';
import { useItems } from '@/contexts/ItemContext';
import { useToast } from '@/hooks/use-toast';

const RecipeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getRecipeById, toggleFavorite, deleteRecipe } = useRecipes();
  const { addToMealPlan } = useMealPlan();
  const { getItemById } = useItems();
  const { toast } = useToast();
  
  const [showMealPlanDialog, setShowMealPlanDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
  
  const recipe = id ? getRecipeById(id) : undefined;

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Recipe not found</h1>
          <Button onClick={() => navigate('/recipes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recipes
          </Button>
        </div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = () => {
    deleteRecipe(recipe.id);
    toast({
      title: "Recipe deleted",
      description: "The recipe has been removed from your collection.",
    });
    navigate('/recipes');
  };

  const handleAddToMealPlan = () => {
    addToMealPlan(recipe.id, selectedDate, selectedMealType);
    setShowMealPlanDialog(false);
    toast({
      title: "Added to meal plan",
      description: `${recipe.title} has been added to your ${selectedMealType} on ${new Date(selectedDate).toLocaleDateString()}.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100">
      {/* Meal Plan Dialog */}
      <Dialog open={showMealPlanDialog} onOpenChange={setShowMealPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Meal Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-medium">{recipe.title}</div>
              <div className="text-sm text-gray-600">{recipe.servings} servings</div>
            </div>
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
            <Button onClick={handleAddToMealPlan} className="w-full">
              Add to Meal Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/recipes')}
              className="text-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFavorite(recipe.id)}
              >
                <Heart 
                  className={`h-4 w-4 ${recipe.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
                />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMealPlanDialog(true)}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </Dialog>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Recipe Header */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{recipe.title}</CardTitle>
                <CardDescription className="text-base">
                  {recipe.description}
                </CardDescription>
              </div>
              {recipe.image && (
                <div className="w-full md:w-48 h-32 bg-gray-200 rounded-lg"></div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  {recipe.prepTime + recipe.cookTime} min total
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="h-4 w-4" />
                <span className="text-sm">{recipe.servings} servings</span>
              </div>
              <Badge className={getDifficultyColor(recipe.difficulty)}>
                {recipe.difficulty}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {recipe.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-3">
              <Button 
                onClick={() => navigate(`/recipes/${recipe.id}/cook`)} 
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <ChefHat className="h-5 w-5 mr-2" />
                Start Cooking
              </Button>
              <Button onClick={() => setShowMealPlanDialog(true)} variant="outline" className="w-full md:w-auto">
                <Calendar className="h-4 w-4 mr-2" />
                Add to Meal Plan
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Times */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{recipe.prepTime}m</div>
              <div className="text-sm text-gray-600">Prep Time</div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{recipe.cookTime}m</div>
              <div className="text-sm text-gray-600">Cook Time</div>
            </CardContent>
          </Card>
        </div>

        {/* Ingredients */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recipe.ingredients.map((ingredient, index) => {
                const item = getItemById(ingredient.itemId);
                return (
                  <li key={ingredient.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                    <span className="text-green-600 mt-1.5 text-xs">●</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {ingredient.quantity} {ingredient.unit} {item?.name || 'Unknown item'}
                      </div>
                      {ingredient.notes && (
                        <div className="text-sm text-gray-600 mt-1">{ingredient.notes}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 pt-0.5">{instruction}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Delete Button */}
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-red-900">Delete Recipe</h3>
                <p className="text-sm text-red-700">This action cannot be undone.</p>
              </div>
              <Button variant="destructive" onClick={handleDelete}>
                Delete Recipe
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RecipeDetails;
