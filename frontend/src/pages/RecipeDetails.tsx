import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Users, Heart, Edit, Calendar, ChefHat, ExternalLink, UtensilsCrossed } from 'lucide-react';
import { ConfirmServingsDialog } from '@/components/meals/ConfirmServingsDialog';
import { ConsumeIngredientsDialog } from '@/components/ConsumeIngredientsDialog';
import { useRecipeStore, type RecipeDeletionImpact } from '@/stores/recipeStore';
import { useStoredItemStore } from '@/stores/storedItemStore';
import { useMealStore } from '@/stores/mealStore';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { getItemDisplayName } from '@/utils/itemUtils';
import { formatQuantityWithUnit, isFreeQuantityUnit } from '@/utils/unitSystem';
import { Item } from '@/services/itemService';
import { useAuthStore } from '@/stores/authStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
    getRecipeDeletionImpact,
    clearCurrentRecipe,
    clearError
  } = useRecipeStore();
  const removeStoredItemsByItemId = useStoredItemStore((s) => s.removeStoredItemsByItemId);
  const currentUser = useAuthStore((state) => state.user);

  const [showAddToMealsDialog, setShowAddToMealsDialog] = useState(false);
  const [showConsumeDialog, setShowConsumeDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletionImpact, setDeletionImpact] = useState<RecipeDeletionImpact | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState(false);
  const { addMeal, saving: addingMeal } = useMealStore();

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
      <div className="min-h-screen bg-background">
        <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/recipes')}
                className="text-muted-foreground"
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">{t('pages.recipes.recipeNotFound')}</h1>
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

    // Pre-flight: fetch deletion impact so the modal can warn about
    // cooked-meal portions that will also be removed.
    try {
      const impact = await getRecipeDeletionImpact(recipe.id);
      setDeletionImpact(impact);
      setDeleteDialogOpen(true);
    } catch {
      // If the impact endpoint fails, fall back to plain confirmation.
      setDeletionImpact(null);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!recipe?.id) return;
    setDeletingRecipe(true);
    try {
      const cookedMealItemId = deletionImpact?.cookedMealItemId ?? null;
      await deleteRecipe(recipe.id);
      // The backend cascade removed the StoredItems too — purge the local cache.
      if (cookedMealItemId) {
        removeStoredItemsByItemId(cookedMealItemId);
      }
      toast({
        title: t('pages.recipes.recipeDeleted'),
        description: t('pages.recipes.recipeRemovedFromCollection'),
      });
      setDeleteDialogOpen(false);
      navigate('/recipes');
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('pages.recipes.failedToDeleteRecipe'),
        variant: "destructive",
      });
    } finally {
      setDeletingRecipe(false);
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

  const getRelevantIngredientsForStep = (stepIndex: number) => {
    if (!recipe) return [];

    const relevantIngredients: number[] = [];

    recipe.ingredients.forEach((ingredient, index) => {
      if (ingredient.usedInSteps && ingredient.usedInSteps.includes(stepIndex)) {
        relevantIngredients.push(index);
        return;
      }

      if (!ingredient.usedInSteps || ingredient.usedInSteps.length === 0) {
        const stepText = recipe.instructions[stepIndex]?.text?.toLowerCase() ?? '';

        if (ingredient.notes && stepText.includes(ingredient.notes.toLowerCase())) {
          relevantIngredients.push(index);
        }
      }
    });

    return relevantIngredients;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Add to Meals Dialog */}
      <ConfirmServingsDialog
        open={showAddToMealsDialog}
        onOpenChange={setShowAddToMealsDialog}
        defaultServings={recipe.servings ?? 1}
        recipeTitle={recipe.title}
        saving={addingMeal}
        onConfirm={async (servings) => {
          try {
            await addMeal(recipe.id, servings);
            toast({
              title: t('pages.meals.toasts.mealAdded', { title: recipe.title }),
            });
            setShowAddToMealsDialog(false);
          } catch (error) {
            toast({
              title: t('messages.error.somethingWentWrong'),
              description: error instanceof Error ? error.message : '',
              variant: 'destructive',
            });
          }
        }}
      />

      {/* Consume Ingredients Dialog */}
      <ConsumeIngredientsDialog
        isOpen={showConsumeDialog}
        onClose={() => setShowConsumeDialog(false)}
        recipe={recipe}
      />

      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('buttons.back')}</span>
            </Button>
            <div className="flex gap-2">
                  {recipe.sourceUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer')}
                    className="w-full md:w-fit"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('pages.importRecipe.viewOriginal')}
                  </Button>
                )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleFavorite}
              >
                <Heart 
                  className={`h-4 w-4 ${recipe.isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
                />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddToMealsDialog(true)}
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
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
          {recipe.imageUrl ? (
            <div className="w-full max-h-[400px] overflow-hidden bg-muted">
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full max-h-[400px] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center py-16">
              <ChefHat className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
          <CardHeader>
            <div>
              <CardTitle className="text-2xl mb-2">{recipe.title}</CardTitle>
              <CardDescription className="text-base">
                {recipe.description}
              </CardDescription>
              {recipe.creator && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('common.addedBy', {
                    name: recipe.creator.id === currentUser?.id
                      ? t('common.you')
                      : recipe.creator.displayName,
                  })}
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  {recipe.totalTime} {t('pages.recipes.minTotal')}
                </span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">{t('pages.recipes.servingCount', { count: recipe.servings })}</span>
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
                onClick={() => navigate(`/recipes/${recipe.id}/cook?servings=${recipe.servings}`)}
                variant="green"
                className="w-full"
                size="lg"
              >
                <ChefHat className="h-5 w-5 shrink-0 mr-2" />
                {t('pages.recipes.startCooking')}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setShowAddToMealsDialog(true)} variant="outline" className="min-w-0">
                  <Calendar className="h-4 w-4 shrink-0 sm:mr-2" />
                  <span className="hidden sm:inline truncate">{t('pages.meals.addRecipe')}</span>
                </Button>
                <Button onClick={() => setShowConsumeDialog(true)} variant="outline" className="min-w-0">
                  <UtensilsCrossed className="h-4 w-4 shrink-0 sm:mr-2" />
                  <span className="hidden sm:inline truncate">{t('pages.recipes.consume.button')}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Times */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{recipe.prepTime}m</div>
              <div className="text-sm text-muted-foreground">{t('pages.recipes.prepTime')}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{recipe.cookTime}m</div>
              <div className="text-sm text-muted-foreground">{t('pages.recipes.cookTime')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Ingredients */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{t('pages.recipes.ingredients')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recipe.ingredients.map((ingredient, index) => {
                const itemName = getItemDisplayName(ingredient?.item as Item, t);
                const isFree = Boolean(ingredient.isFreeQuantity) || isFreeQuantityUnit(ingredient.unit);
                const label = formatQuantityWithUnit(ingredient.quantity, ingredient.unit, t, {
                  item: ingredient.item as { name?: string; pieceAlias?: string | null } | null,
                  itemName,
                  isFreeQuantity: isFree,
                });
                return (
                  <li key={ingredient.id} className="flex items-start gap-3 p-2 bg-muted rounded-lg">
                    <span className="text-green-600 mt-1.5 text-xs">●</span>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {label} {itemName}
                      </div>
                      {ingredient.notes && (
                        <div className="text-sm text-muted-foreground mt-1">{ingredient.notes}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{t('pages.recipes.instructions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => {
                const relevantIngredients = getRelevantIngredientsForStep(index);

                return (
                  <li key={index} className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-foreground pt-0.5">{instruction.text}</span>
                    </div>

                    {relevantIngredients.length > 0 && (
                      <div className="ml-9 mt-1 p-3 bg-muted rounded-lg">
                        <ul className="space-y-1">
                          {relevantIngredients.map((ingredientIndex) => {
                            const ingredient = recipe.ingredients[ingredientIndex];
                            const itemName = getItemDisplayName(ingredient?.item as Item, t);
                            const isFree = Boolean(ingredient.isFreeQuantity) || isFreeQuantityUnit(ingredient.unit);
                            const label = formatQuantityWithUnit(ingredient.quantity, ingredient.unit, t, {
                              item: ingredient.item as { name?: string; pieceAlias?: string | null } | null,
                              itemName,
                              isFreeQuantity: isFree,
                            });

                            return (
                              <li
                                key={ingredient.id ?? ingredientIndex}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <span>
                                  {label} {itemName}
                                  {ingredient.notes && (
                                    <span className="italic text-xs text-muted-foreground">
                                      {' '}
                                      ({ingredient.notes})
                                    </span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Delete Button */}
        <Card className="bg-primary/10 border-red-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{t('pages.recipes.deleteRecipe')}</h3>
                <p className="text-sm">{t('pages.recipes.deleteWarning')}</p>
              </div>
              <Button variant="delete" onClick={handleDelete}>
                {t('pages.recipes.deleteRecipe')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recipe deletion confirmation modal — warns about cooked-meal portions
            that will be removed in cascade. */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('cookedMeal.deleteRecipe.title')}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block">
                  {t('cookedMeal.deleteRecipe.intro', { title: recipe?.title ?? '' })}
                </span>
                {deletionImpact?.hasCookedMealItem && deletionImpact.totalPortions > 0 && (
                  <span className="block">
                    {t('cookedMeal.deleteRecipe.impact', {
                      count: deletionImpact.totalPortions,
                      portions: deletionImpact.totalPortions,
                      dishName: deletionImpact.cookedMealItemName ?? '',
                    })}
                  </span>
                )}
                {deletionImpact?.hasCookedMealItem && (
                  <span className="block font-medium text-destructive">
                    {t('cookedMeal.deleteRecipe.warning')}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingRecipe}>
                {t('cookedMeal.deleteRecipe.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deletingRecipe}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('cookedMeal.deleteRecipe.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

const RecipeDetailsSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Recipe Header */}
      <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
        <Skeleton className="w-full max-h-[400px] h-[300px]" />
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
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
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4 text-center space-y-2">
            <Skeleton className="h-8 w-12 mx-auto" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </CardContent>
        </Card>
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4 text-center space-y-2">
            <Skeleton className="h-8 w-12 mx-auto" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </CardContent>
        </Card>
      </div>

      {/* Ingredients */}
      <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3 p-2 bg-muted rounded-lg">
                <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2" />
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
      <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
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
