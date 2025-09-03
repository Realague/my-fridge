
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useRecipeStore } from '@/stores/recipeStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { RecipeDto, UpdateRecipeDto, CreateRecipeIngredientDto, RecipeDifficulty } from '@/services/recipeService';
import { StructuredIngredientInput } from '@/components/StructuredIngredientInput';
import { useToast } from '@/hooks/use-toast';
import { useItemService } from '@/services/itemService';
import { useTranslation } from 'react-i18next';

interface RecipeFormData {
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const EditRecipe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Protected route hook handles auth and household checks
  const { selectedHouseholdId } = useProtectedRoute();
  
  const { currentRecipe, fetchRecipeById, updateRecipe, loading, error, clearError } = useRecipeStore();
  const { toast } = useToast();
  const { getItemById } = useItemService();
  
  const recipe = currentRecipe;
  
  // Fetch recipe on component mount
  useEffect(() => {
    if (id && selectedHouseholdId && (!recipe || recipe.id !== id)) {
      fetchRecipeById(selectedHouseholdId, id);
    }
  }, [id, selectedHouseholdId, recipe, fetchRecipeById]);

  // Clear any existing errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);
  
  const [ingredients, setIngredients] = useState(recipe?.ingredients || []);
  const [instructions, setInstructions] = useState(recipe?.instructions || []);
  const [tags, setTags] = useState<string[]>(recipe?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [ingredientStepMap, setIngredientStepMap] = useState<{[ingredientId: string]: number[]}>({});

  const form = useForm<RecipeFormData>({
    defaultValues: {
      title: recipe?.title || '',
      description: recipe?.description || '',
      prepTime: recipe?.prepTime || 10,
      cookTime: recipe?.cookTime || 20,
      servings: recipe?.servings || 4,
      difficulty: recipe?.difficulty || 'Easy',
    }
  });

  useEffect(() => {
    if (recipe) {
      form.reset({
        title: recipe.title,
        description: recipe.description,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
      });
      setIngredients(recipe.ingredients);
      setInstructions(recipe.instructions);
      setTags(recipe.tags);
      
      // Initialize ingredient-step mapping from existing recipe
      const initialMap: {[ingredientId: string]: number[]} = {};
      recipe.ingredients.forEach(ingredient => {
        if (ingredient.usedInSteps && ingredient.usedInSteps.length > 0) {
          initialMap[ingredient.id] = ingredient.usedInSteps;
        }
      });
      setIngredientStepMap(initialMap);
    }
  }, [recipe, form]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('pages.recipes.loading')}</p>
        </div>
      </div>
    );
  }

  // Show error or not found state
  if (!recipe || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error ? 'Error loading recipe' : 'Recipe not found'}
          </h1>
          {error && <p className="text-red-600 mb-4">{error}</p>}
          <Button onClick={() => navigate('/recipes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('pages.recipes.backToRecipes')}
          </Button>
        </div>
      </div>
    );
  }

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const removeInstruction = (index: number) => {
    const newInstructions = instructions.filter((_, i) => i !== index);
    setInstructions(newInstructions);
    
    // Update ingredient-step mappings when removing a step
    const updatedMap = { ...ingredientStepMap };
    Object.keys(updatedMap).forEach(ingredientId => {
      updatedMap[ingredientId] = updatedMap[ingredientId]
        .filter(stepIndex => stepIndex !== index)
        .map(stepIndex => stepIndex > index ? stepIndex - 1 : stepIndex);
    });
    setIngredientStepMap(updatedMap);
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const toggleIngredientForStep = (ingredientId: string, stepIndex: number) => {
    const currentSteps = ingredientStepMap[ingredientId] || [];
    const isLinked = currentSteps.includes(stepIndex);
    
    if (isLinked) {
      setIngredientStepMap({
        ...ingredientStepMap,
        [ingredientId]: currentSteps.filter(step => step !== stepIndex)
      });
    } else {
      setIngredientStepMap({
        ...ingredientStepMap,
        [ingredientId]: [...currentSteps, stepIndex].sort((a, b) => a - b)
      });
    }
  };

  const onSubmit = async (data: RecipeFormData) => {
    if (!selectedHouseholdId || !recipe?.id) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.missingHouseholdOrRecipeInformation'),
        variant: "destructive",
      });
      return;
    }

    const validIngredients = ingredients.filter(ing => ing.itemId && ing.quantity > 0);
    const filteredInstructions = instructions.filter(inst => inst.trim() !== '');
    
    if (validIngredients.length === 0) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.addAtLeastOneIngredient'),
        variant: "destructive",
      });
      return;
    }

    if (filteredInstructions.length === 0) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.addAtLeastOneInstruction'),
        variant: "destructive",
      });
      return;
    }

    // Add step mapping to ingredients
    const ingredientsWithSteps = validIngredients.map(ingredient => ({
      ...ingredient,
      usedInSteps: ingredientStepMap[ingredient.id] || []
    }));

    const updatedRecipe: UpdateRecipeDto = {
      ...data,
      ingredients: ingredientsWithSteps,
      instructions: filteredInstructions,
      tags
    };

    try {
      await updateRecipe(selectedHouseholdId, recipe.id, updatedRecipe);
      
      toast({
        title: t('messages.success.recipeUpdated'),
        description: t('messages.success.recipeUpdatedSuccessfully'),
      });
      
      navigate(`/recipes/${recipe.id}`);
    } catch (error) {
      console.error('Recipe update failed:', error);
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: error instanceof Error ? error.message : t('messages.error.failedToUpdateRecipe'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate(`/recipes/${recipe.id}`)}
              className="text-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('buttons.back')}
            </Button>
            <h1 className="text-xl font-bold text-gray-900">Edit Recipe</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>{t('pages.recipes.basicInformation')}</CardTitle>
                <CardDescription>{t('pages.recipes.basicInformationDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  rules={{ required: "Recipe title is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pages.recipes.recipeTitle')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('pages.recipes.titlePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  rules={{ required: "Description is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pages.recipes.description')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('pages.recipes.descriptionPlaceholder')}
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="prepTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pages.recipes.prepTime')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cookTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pages.recipes.cookTime')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="servings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pages.recipes.servings')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pages.recipes.difficulty')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Easy">{t('pages.recipes.difficultyOptions.easy')}</SelectItem>
                            <SelectItem value="Medium">{t('pages.recipes.difficultyOptions.medium')}</SelectItem>
                            <SelectItem value="Hard">{t('pages.recipes.difficultyOptions.hard')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Structured Ingredients */}
            <StructuredIngredientInput
              ingredients={ingredients}
              onIngredientsChange={setIngredients}
            />

            {/* Instructions */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('pages.recipes.instructions')}</CardTitle>
                    <CardDescription>{t('pages.recipes.instructionsDescription')}</CardDescription>
                  </div>
                  <Button type="button" onClick={addInstruction} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    {t('buttons.add')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {instructions.map((instruction, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium mt-2">
                        {index + 1}
                      </div>
                      <Textarea
                        placeholder={`Step ${index + 1} instructions...`}
                        value={instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        className="flex-1 min-h-[60px]"
                      />
                      {instructions.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeInstruction(index)}
                          className="mt-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Ingredient mapping for this step */}
                    {ingredients.length > 0 && instruction.trim() && (
                      <div className="ml-8 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          {t('pages.recipes.ingredientsUsedInThisStep')}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {ingredients.map((ingredient) => {
                            const item = getItemById(ingredient.itemId);
                            if (!item) return null;
                            
                            const isLinked = (ingredientStepMap[ingredient.id] || []).includes(index);
                            
                            return (
                              <div key={ingredient.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={isLinked}
                                  onCheckedChange={() => toggleIngredientForStep(ingredient.id, index)}
                                />
                                <span className="text-sm text-gray-600">
                                  {ingredient.quantity} {ingredient.unit} {/*{item.name}*/}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>{t('pages.recipes.tags')}</CardTitle>
                <CardDescription>{t('pages.recipes.tagsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('pages.recipes.addTagPlaceholder')}
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1"
                  />
                  <Button type="button" onClick={addTag}>{t('pages.recipes.addTag')}</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <div key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(`/recipes/${recipe.id}`)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                {t('pages.recipes.saveRecipe')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default EditRecipe;
