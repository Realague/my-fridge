
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Plus, X, Clock, ChevronDown, Trash2 } from 'lucide-react';
import { useRecipeStore } from '@/stores/recipeStore';
import { UpdateRecipeDto, RecipeStep } from '@/services/recipeService';
import { StructuredIngredientInput, StructuredIngredient } from '@/components/StructuredIngredientInput';
import { useToast } from '@/hooks/use-toast';
import { useItemService } from '@/services/itemService';
import { useTranslation } from 'react-i18next';
import { getItemDisplayName } from '@/utils/itemUtils';
import { formatQuantityWithUnit } from '@/utils/unitSystem';
import { ImageUpload } from '@/components/ImageUpload';

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
  
  const { currentRecipe, fetchRecipeById, updateRecipe, loading, error, clearError } = useRecipeStore();
  const { toast } = useToast();
  const { getItemById } = useItemService();
  
  const recipe = currentRecipe;
  
  // Fetch recipe on component mount
  useEffect(() => {
    if (id && (!recipe || recipe.id !== id)) {
      fetchRecipeById(id);
    }
  }, [id, recipe, fetchRecipeById]);

  // Clear any existing errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);
  
  const [ingredients, setIngredients] = useState<StructuredIngredient[]>(recipe?.ingredients.map(ingredient => ({
    ...ingredient,
    item: ingredient.item as StructuredIngredient['item']
  })) || []);
  const [instructions, setInstructions] = useState<RecipeStep[]>(recipe?.instructions || []);
  const [tags, setTags] = useState<string[]>(recipe?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [ingredientStepMap, setIngredientStepMap] = useState<{[ingredientKey: string]: number[]}>({});
  const [imageUrl, setImageUrl] = useState<string | null>(recipe?.imageUrl || null);

  // Helper function to generate a unique key for ingredients
  const getIngredientKey = (ingredient: any, index: number) => {
    return ingredient.id || `new-${index}-${ingredient.itemId}`;
  };

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
      setIngredients(recipe.ingredients.map(ingredient => ({
        ...ingredient,
        // Recipe DTOs can carry a null quantity when the ingredient is marked
        // as a free quantity ("à l'œil"). Keep that shape for the UI.
        quantity: ingredient.quantity as number | null,
        isFreeQuantity: Boolean(ingredient.isFreeQuantity),
        item: ingredient.item as StructuredIngredient['item']
      })));
      setInstructions(recipe.instructions);
      setTags(recipe.tags);
      setImageUrl(recipe.imageUrl);
      
      // Initialize ingredient-step mapping from existing recipe
      const initialMap: {[ingredientKey: string]: number[]} = {};
      recipe.ingredients.forEach((ingredient, index) => {
        if (ingredient.usedInSteps && ingredient.usedInSteps.length > 0) {
          const key = getIngredientKey(ingredient, index);
          initialMap[key] = ingredient.usedInSteps;
        }
      });
      setIngredientStepMap(initialMap);
    }
  }, [recipe, form]);

  // Show loading state
  if (loading) {
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
  if (!recipe || error) {
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

  const addInstruction = () => {
    setInstructions([...instructions, { text: '', duration: null }]);
  };

  const removeInstruction = (index: number) => {
    const newInstructions = instructions.filter((_, i) => i !== index);
    setInstructions(newInstructions);
    
    const updatedMap = { ...ingredientStepMap };
    Object.keys(updatedMap).forEach(ingredientId => {
      updatedMap[ingredientId] = updatedMap[ingredientId]
        .filter(stepIndex => stepIndex !== index)
        .map(stepIndex => stepIndex > index ? stepIndex - 1 : stepIndex);
    });
    setIngredientStepMap(updatedMap);
  };

  const updateInstructionText = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = { ...updated[index], text: value };
    setInstructions(updated);
  };

  const updateInstructionDuration = (index: number, minutes: number | null) => {
    const updated = [...instructions];
    updated[index] = { ...updated[index], duration: minutes != null ? minutes * 60 : null };
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

  const toggleIngredientForStep = (ingredient: any, ingredientIndex: number, stepIndex: number) => {
    const ingredientKey = getIngredientKey(ingredient, ingredientIndex);
    const currentSteps = ingredientStepMap[ingredientKey] || [];
    const isLinked = currentSteps.includes(stepIndex);
    
    if (isLinked) {
      setIngredientStepMap({
        ...ingredientStepMap,
        [ingredientKey]: currentSteps.filter(step => step !== stepIndex)
      });
    } else {
      setIngredientStepMap({
        ...ingredientStepMap,
        [ingredientKey]: [...currentSteps, stepIndex].sort((a, b) => a - b)
      });
    }
  };

  const onSubmit = async (data: RecipeFormData) => {
    if (!recipe?.id) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.missingHouseholdOrRecipeInformation'),
        variant: "destructive",
      });
      return;
    }

    const validIngredients = ingredients.filter(ing =>
      ing.itemId && (ing.isFreeQuantity || (ing.quantity !== null && ing.quantity !== undefined && ing.quantity > 0))
    );
    const filteredInstructions = instructions.filter(inst => inst.text.trim() !== '');
    
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

    // Check for duplicate ingredients
    const itemIds = validIngredients.map(ing => ing.itemId);
    const duplicateItemIds = itemIds.filter((itemId, index) => itemIds.indexOf(itemId) !== index);
    
    if (duplicateItemIds.length > 0) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.duplicateIngredients'),
        variant: "destructive",
      });
      return;
    }

    // Add step mapping to ingredients and remove client-generated IDs
    const ingredientsWithSteps = validIngredients.map((ingredient, index) => {
      const { id, ...ingredientWithoutId } = ingredient;
      const ingredientKey = getIngredientKey(ingredient, index);
      return {
        ...ingredientWithoutId,
        quantity: ingredient.isFreeQuantity ? null : ingredient.quantity,
        isFreeQuantity: Boolean(ingredient.isFreeQuantity),
        usedInSteps: ingredientStepMap[ingredientKey] || []
      };
    });

    const updatedRecipe: UpdateRecipeDto = {
      ...data,
      ingredients: ingredientsWithSteps,
      instructions: filteredInstructions,
      tags,
      imageUrl: imageUrl || undefined
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate(`/recipes/${recipe.id}`)}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('buttons.back')}
            </Button>
            <h1 className="text-xl font-bold text-foreground">{t('pages.recipes.editRecipeTitle')}</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg">
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

            {/* Recipe Image */}
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle>{t('pages.recipes.recipeImage')}</CardTitle>
                <CardDescription>{t('pages.recipes.recipeImageDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  currentImageUrl={imageUrl}
                  onImageUpload={setImageUrl}
                  onImageRemove={() => setImageUrl(null)}
                  folder="recipes"
                  label={t('pages.recipes.uploadImage')}
                />
              </CardContent>
            </Card>

            {/* Structured Ingredients */}
            <StructuredIngredientInput
              ingredients={ingredients}
              onIngredientsChange={(updatedIngredients) => {
                setIngredients(updatedIngredients);
                
                // Clean up ingredient-step mappings for deleted ingredients
                const currentIngredientKeys = updatedIngredients.map((ingredient, index) => 
                  getIngredientKey(ingredient, index)
                );
                const updatedMap = { ...ingredientStepMap };
                Object.keys(updatedMap).forEach(ingredientKey => {
                  if (!currentIngredientKeys.includes(ingredientKey)) {
                    delete updatedMap[ingredientKey];
                  }
                });
                setIngredientStepMap(updatedMap);
              }}
            />

            {/* Instructions */}
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('pages.recipes.instructions')}</CardTitle>
                    <CardDescription>{t('pages.recipes.instructionsDescription')}</CardDescription>
                  </div>
                  <Button variant="outline" type="button" onClick={addInstruction} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    {t('buttons.add')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {instructions.map((instruction, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium mt-2">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder={`Step ${index + 1} instructions...`}
                          value={instruction.text}
                          onChange={(e) => updateInstructionText(index, e.target.value)}
                          className="min-h-[60px]"
                        />
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            placeholder={t('pages.recipes.durationPlaceholder')}
                            value={instruction.duration != null ? instruction.duration / 60 : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateInstructionDuration(index, val === '' ? null : parseFloat(val) || 0);
                            }}
                            className="w-24 h-7 text-xs"
                          />
                          <span className="text-xs text-muted-foreground">min</span>
                        </div>
                      </div>
                      {instructions.length > 1 && (
                        <Button
                          type="button"
                          variant="deleteTrash"
                          size="sm"
                          onClick={() => removeInstruction(index)}
                          className="mt-2"
                          aria-label={t('messages.action.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    {ingredients.length > 0 && instruction.text.trim() && (
                      <div className="ml-8">
                        <Collapsible defaultOpen={false}>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="group flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted data-[state=open]:bg-muted"
                            >
                              <span>{t('pages.recipes.ingredientsUsedInThisStep')}</span>
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 rounded-lg border border-border/50 bg-muted p-3">
                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                {ingredients.map((ingredient, ingredientIndex) => {
                                  const item = getItemById(ingredient.itemId);
                                  if (!item) return null;
                                  const ingredientKey = getIngredientKey(ingredient, ingredientIndex);
                                  const isLinked = (ingredientStepMap[ingredientKey] || []).includes(index);
                                  return (
                                    <div key={ingredientKey} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={isLinked}
                                        onCheckedChange={() => toggleIngredientForStep(ingredient, ingredientIndex, index)}
                                      />
                                      <span className="text-sm text-muted-foreground">
                                        {(() => {
                                          const itemName = getItemDisplayName(ingredient?.item, t);
                                          const label = formatQuantityWithUnit(ingredient.quantity, ingredient.unit, t, {
                                            item: ingredient.item,
                                            itemName,
                                            isFreeQuantity: ingredient.isFreeQuantity,
                                          });
                                          return `${itemName} ${label}`;
                                        })()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg">
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
                  <Button
                    variant="outline"
                    type="button"
                    onClick={addTag}
                    className="shrink-0"
                    aria-label={t('pages.recipes.addTag')}
                  >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('pages.recipes.addTag')}</span>
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <div key={index} className="bg-accent text-accent-foreground px-2 py-1 rounded-full text-sm flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-accent-foreground hover:text-accent-foreground/80"
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
                {t('buttons.cancel')}
              </Button>
              <Button variant="green" type="submit" className="flex-1">
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
