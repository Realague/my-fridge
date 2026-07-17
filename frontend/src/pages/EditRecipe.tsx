import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecipeStore } from '@/stores/recipeStore';
import { UpdateRecipeDto } from '@/services/recipeService';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { RecipeEditor, RecipeEditorSubmitData } from '@/components/recipe-editor/RecipeEditor';
import { EditorIngredient, newIngredientId } from '@/components/recipe-editor/types';

const EditRecipe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { currentRecipe, fetchRecipeById, updateRecipe, loading, error, clearError } = useRecipeStore();
  const { toast } = useToast();

  const recipe = currentRecipe && currentRecipe.id === id ? currentRecipe : null;

  // Fetch recipe on component mount
  useEffect(() => {
    if (id && !recipe) {
      fetchRecipeById(id);
    }
  }, [id, recipe, fetchRecipeById]);

  // Clear any existing errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Map the recipe to editor values: every ingredient gets a stable client id
  // so the ingredient → step mapping survives edits.
  const initialValues = useMemo(() => {
    if (!recipe) return null;
    const ingredients: EditorIngredient[] = recipe.ingredients.map((ingredient) => ({
      id: ingredient.id || newIngredientId(),
      itemId: ingredient.itemId,
      item: ingredient.item as EditorIngredient['item'],
      // Recipe DTOs can carry a null quantity when the ingredient is marked
      // as a free quantity ("à l'œil"). Keep that shape for the UI.
      quantity: ingredient.quantity as number | null,
      unit: ingredient.unit,
      isFreeQuantity: Boolean(ingredient.isFreeQuantity),
      notes: ingredient.notes,
    }));

    const ingredientStepMap: Record<string, number[]> = {};
    recipe.ingredients.forEach((ingredient, index) => {
      if (ingredient.usedInSteps && ingredient.usedInSteps.length > 0) {
        ingredientStepMap[ingredients[index].id] = ingredient.usedInSteps;
      }
    });

    return {
      title: recipe.title,
      description: recipe.description,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      ingredients,
      instructions: recipe.instructions,
      tags: recipe.tags,
      ingredientStepMap,
      imageUrl: recipe.imageUrl,
    };
  }, [recipe]);

  // Show loading state only while the recipe itself is being fetched — once
  // the editor is mounted it must stay mounted (it owns the edit state).
  if (!recipe && loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('pages.recipes.loading')}</p>
        </div>
      </div>
    );
  }

  // Show error or not found state
  if (!recipe || !initialValues) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {error ? 'Error loading recipe' : 'Recipe not found'}
          </h1>
          {error && <p className="text-destructive mb-4">{error}</p>}
          <Button onClick={() => navigate('/recipes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('pages.recipes.backToRecipes')}
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: RecipeEditorSubmitData) => {
    const updatedRecipe: UpdateRecipeDto = {
      title: data.title,
      description: data.description,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      servings: data.servings,
      difficulty: data.difficulty,
      ingredients: data.ingredients,
      instructions: data.instructions,
      tags: data.tags,
      imageUrl: data.imageUrl || undefined,
    };

    try {
      await updateRecipe(recipe.id, updatedRecipe);

      toast({
        title: t('messages.success.recipeUpdated'),
        description: t('messages.success.recipeUpdatedSuccessfully'),
      });

      navigate(`/recipes/${recipe.id}`);
    } catch (error) {
      console.error('Recipe update failed:', error);
      const message = error instanceof Error ? error.message : '';
      const isInvalidIngredients =
        message.includes('article that no longer exists') || message.includes('ingredients reference');
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: isInvalidIngredients
          ? t('messages.error.invalidRecipeIngredients')
          : message || t('messages.error.failedToUpdateRecipe'),
        variant: "destructive",
      });
    }
  };

  return (
    <RecipeEditor
      key={recipe.id}
      mode="edit"
      breadcrumb={recipe.title}
      initialValues={initialValues}
      saving={loading}
      onSubmit={handleSubmit}
      onBack={() => navigate(-1)}
      onCancel={() => navigate(`/recipes/${recipe.id}`)}
    />
  );
};

export default EditRecipe;
