import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRecipeStore } from '@/stores/recipeStore';
import { useAuthStore } from '@/stores/authStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { ParsedMarmitonRecipe } from '@/services/recipeService';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Item } from '@/services/itemService';
import { uploadImageWithSignature, uploadImageFromUrl } from '@/services/imageUploadService';
import { RecipeEditor, RecipeEditorSubmitData } from '@/components/recipe-editor/RecipeEditor';
import { EditorIngredient, newIngredientId } from '@/components/recipe-editor/types';

const AddRecipe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Get imported recipe and selected ingredients from navigation state
  const locationState = location.state as {
    importedRecipe?: ParsedMarmitonRecipe;
    selectedIngredients?: Array<{
      originalText: string;
      quantity: number | null;
      unit: string | null;
      itemId: string | null;
      itemName: string | null;
      translatedName: string | null;
      availableUnits: string[];
      isFreeQuantity?: boolean;
      originalIndex?: number;
    }>;
    ingredientStepMapping?: { [ingredientIndex: number]: number[] };
  };
  const importedRecipe = locationState?.importedRecipe;
  const selectedIngredients = locationState?.selectedIngredients;
  const ingredientStepMapping = locationState?.ingredientStepMapping;

  // Protected route hook handles auth and household checks
  const { selectedHouseholdId } = useProtectedRoute();

  const { user } = useAuthStore();
  const { createRecipe, loading, clearError } = useRecipeStore();

  // Initialize ingredients from selected ingredients if provided
  const initialIngredients = React.useMemo<EditorIngredient[]>(() => {
    if (selectedIngredients && selectedIngredients.length > 0) {
      return selectedIngredients
        .filter(ing => ing.itemId !== null)
        .map((ing) => ({
          id: newIngredientId(),
          itemId: ing.itemId!,
          quantity: ing.isFreeQuantity ? null : (ing.quantity ?? 1),
          unit: ing.unit || 'piece',
          isFreeQuantity: Boolean(ing.isFreeQuantity),
          notes: '',
          item: {
            id: ing.itemId!,
            name: ing.itemName || '',
            category: 'other',
            defaultUnit: ing.unit || 'piece',
            availableUnits: ing.availableUnits || [ing.unit || 'piece'],
          } as Item,
        }));
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialStepMap = React.useMemo(() => {
    if (!ingredientStepMapping || !selectedIngredients || initialIngredients.length === 0) return {};
    const map: { [ingredientId: string]: number[] } = {};
    const filtered = selectedIngredients.filter(ing => ing.itemId !== null);
    filtered.forEach((ing, i) => {
      const origIdx = ing.originalIndex;
      if (origIdx === undefined) return;
      const steps = ingredientStepMapping[origIdx];
      if (steps && steps.length > 0 && initialIngredients[i]) {
        map[initialIngredients[i].id] = steps;
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Raw imported ingredient lines are shown as a reference card when no
  // structured ingredients were selected during the import flow.
  const importedIngredients =
    selectedIngredients && selectedIngredients.length > 0 ? [] : (importedRecipe?.ingredients || []);

  // Clear any existing errors when component mounts
  React.useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (data: RecipeEditorSubmitData) => {
    if (!selectedHouseholdId || !user?.id) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.missingHouseholdOrUserInformation'),
        variant: "destructive",
      });
      return;
    }

    const recipeData = {
      title: data.title,
      description: data.description,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      servings: data.servings,
      difficulty: data.difficulty,
      instructions: data.instructions,
      tags: data.tags,
      sourceUrl: importedRecipe?.sourceUrl,
      // Import traceability (Schema.org pipeline): where and when the
      // recipe was ingested. Absent for hand-created recipes.
      sourceDomain: importedRecipe?.sourceDomain,
      importedAt: importedRecipe?.importedAt,
      // image is uploaded after create
      ingredients: data.ingredients,
    };

    try {
      // Clear any existing errors before creating the recipe
      clearError();

      const newRecipe = await createRecipe(recipeData);

      // Handle image upload after recipe creation:
      // 1) If the user selected a local image file, upload that
      // 2) Otherwise, if we have an imported image URL, import it to Cloudinary
      if (data.imageFile) {
        try {
          const uploadedImageUrl = await uploadImageWithSignature('recipes', data.imageFile);
          await useRecipeStore.getState().updateRecipe(newRecipe.id, { imageUrl: uploadedImageUrl });
        } catch (e) {
          // Non-fatal: recipe is created without image
          console.error('Deferred image upload failed:', e);
        }
      } else if (data.imageUrl && !data.imageUrl.startsWith('blob:')) {
        try {
          // If the image is not already a Cloudinary URL, import it
          const isCloudinary = data.imageUrl.includes('res.cloudinary.com');
          const finalImageUrl = isCloudinary
            ? data.imageUrl
            : await uploadImageFromUrl('recipes', data.imageUrl);

          await useRecipeStore.getState().updateRecipe(newRecipe.id, { imageUrl: finalImageUrl });
        } catch (e) {
          // Non-fatal: recipe is created without image
          console.error('Imported image upload failed:', e);
        }
      }

      toast({
        title: t('messages.success.recipeAdded'),
        description: t('messages.success.recipeSaved'),
      });

      // Clear any errors that might have been set and navigate
      clearError();
      navigate('/recipes');
    } catch (error) {
      console.error('Recipe creation failed:', error);
      toast({
        title: t('messages.error.somethingWentWrong'),
        variant: "destructive",
      });
    }
  };

  return (
    <RecipeEditor
      mode="create"
      breadcrumb={t('pages.recipes.editor.newRecipe')}
      initialValues={{
        title: importedRecipe?.title ?? '',
        description: importedRecipe?.description ?? '',
        prepTime: importedRecipe?.prepTime ?? null,
        cookTime: importedRecipe?.cookTime ?? null,
        servings: importedRecipe?.servings ?? null,
        difficulty: importedRecipe?.difficulty ?? 'Easy',
        ingredients: initialIngredients,
        instructions: importedRecipe?.instructions,
        ingredientStepMap: initialStepMap,
        imageUrl: importedRecipe?.imageUrl || null,
        tags: importedRecipe?.tags ?? [],
      }}
      saving={loading}
      deferImageUpload
      importedIngredients={importedIngredients}
      onSubmit={handleSubmit}
      onBack={() => navigate('/recipes')}
    />
  );
};

export default AddRecipe;
