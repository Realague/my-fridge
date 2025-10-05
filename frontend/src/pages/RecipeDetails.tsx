import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Users, Heart, Edit, Calendar, ChefHat } from 'lucide-react';
import { AddMealPlanDialog } from '@/components/AddMealPlanDialog';
import { useRecipeStore } from '@/stores/recipeStore';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { getItemDisplayName } from '@/utils/itemUtils';
import { Item } from '@/services/itemService';

const RecipeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const { 
    currentRecipe: recipe, 
    loading, 
    error, 
    fetchRecipeById, 
    toggleFavorite, 
    deleteRecipe,
    clearCurrentRecipe,
    clearError
  } = useRecipeStore();
  
  const [showMealPlanDialog, setShowMealPlanDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRecipeById(id);
    }
    
    return () => {
      clearCurrentRecipe();
    };
  }, [id, fetchRecipeById, clearCurrentRecipe]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      clearError();
    }
  }, [error, toast, clearError]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100">
        <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/recipes')}
                className="text-gray-600"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('buttons.back')}
              </Button>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <RecipeDetailsSkeleton />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('pages.recipes.recipeNotFound')}</h1>
          <Button onClick={() => navigate('/recipes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('pages.recipes.backToRecipes')}
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

  const handleDelete = async () => {
    if (!recipe?.id) return;
    
    try {
      await deleteRecipe(recipe.id);
      toast({
        title: t('pages.recipes.recipeDeleted'),
        description: t('pages.recipes.recipeRemovedFromCollection'),
      });
      navigate('/recipes');
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('pages.recipes.failedToDeleteRecipe'),
        variant: "destructive",
      });
    }
  };

  const handleToggleFavorite = async () => {
    if (!recipe?.id) return;
    
    try {
      await toggleFavorite(recipe.id);
      toast({
        title: t('messages.success.success'),
        description: recipe.isFavorite ? t('pages.recipes.removedFromFavorites') : t('pages.recipes.addedToFavorites'),
      });
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('pages.recipes.failedToUpdateFavoriteStatus'),
        variant: "destructive",
      });
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100">
      {/* Add Meal Plan Dialog */}
      <AddMealPlanDialog
        isOpen={showMealPlanDialog}
        onClose={() => setShowMealPlanDialog(false)}
        preselectedRecipe={recipe}
      />

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
              {t('buttons.back')}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleFavorite}
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
                  {recipe.totalTime} {t('pages.recipes.minTotal')}
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="h-4 w-4" />
                <span className="text-sm">{recipe.servings} {t('pages.recipes.servings')}</span>
              </div>
              <Badge className={getDifficultyColor(recipe.difficulty)}>
                {t(`pages.recipes.difficultyOptions.${recipe.difficulty.toLowerCase()}`)}
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
                {t('pages.recipes.startCooking')}
              </Button>
              <Button onClick={() => setShowMealPlanDialog(true)} variant="outline" className="w-full md:w-auto">
                <Calendar className="h-4 w-4 mr-2" />
                {t('pages.recipes.addToMealPlan')}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Times */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{recipe.prepTime}m</div>
              <div className="text-sm text-gray-600">{t('pages.recipes.prepTime')}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{recipe.cookTime}m</div>
              <div className="text-sm text-gray-600">{t('pages.recipes.cookTime')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Ingredients */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">{t('pages.recipes.ingredients')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recipe.ingredients.map((ingredient, index) => {
                return (
                  <li key={ingredient.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                    <span className="text-green-600 mt-1.5 text-xs">●</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {getItemDisplayName(ingredient?.item as Item, t)} {ingredient.quantity} {ingredient.unit}
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
                <h3 className="font-medium text-red-900">{t('pages.recipes.deleteRecipe')}</h3>
                <p className="text-sm text-red-700">{t('pages.recipes.deleteWarning')}</p>
              </div>
              <Button variant="destructive" onClick={handleDelete}>
                {t('pages.recipes.deleteRecipe')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const RecipeDetailsSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Recipe Header */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="w-full md:w-48 h-32 rounded-lg" />
          </div>
          
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>

          <div className="pt-4 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-48" />
          </div>
        </CardHeader>
      </Card>

      {/* Times */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4 text-center space-y-2">
            <Skeleton className="h-8 w-12 mx-auto" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4 text-center space-y-2">
            <Skeleton className="h-8 w-12 mx-auto" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </CardContent>
        </Card>
      </div>

      {/* Ingredients */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-1 h-1 bg-gray-400 rounded-full mt-2" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="w-6 h-6 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipeDetails;
