import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { useAuthStore } from '@/stores/authStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { CreateRecipeIngredientDto, RecipeDifficulty, ParsedMarmitonRecipe, RecipeStep } from '@/services/recipeService';
import { useToast } from '@/hooks/use-toast';
import { StructuredIngredientInput } from '@/components/StructuredIngredientInput';
import { useTranslation } from 'react-i18next';
import { Item } from '@/services/itemService';
import { getItemDisplayName } from '@/utils/itemUtils';
import { formatQuantityWithUnit } from '@/utils/unitSystem';
import { ImageUpload } from '@/components/ImageUpload';
import { uploadImageWithSignature, uploadImageFromUrl } from '@/services/imageUploadService';
import { useIsMobile } from '@/hooks/use-mobile';

interface RecipeIngredientWithId extends Omit<CreateRecipeIngredientDto, 'quantity'> {
  id: string;
  // Always present in state — may be null when the ingredient is a free quantity.
  quantity: number | null;
  item?: Item;
}

interface RecipeFormData {
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  ingredients: RecipeIngredientWithId[];
  instructions: RecipeStep[];
  tags: string[];
}

const AddRecipe = () => {
  const isMobile = useIsMobile();
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
  
  const form = useForm<RecipeFormData>({
    defaultValues: {
      title: importedRecipe?.title ?? '',
      description: importedRecipe?.description ?? '',
      prepTime: importedRecipe?.prepTime ?? 10,
      cookTime: importedRecipe?.cookTime ?? 20,
      servings: importedRecipe?.servings ?? 4,
      difficulty: importedRecipe?.difficulty ?? 'Easy',
      ingredients: [],
      instructions: importedRecipe?.instructions ?? [{ text: '', duration: null }],
      tags: [],
    },
  });

  // Initialize ingredients from selected ingredients if provided
  const initialIngredients = React.useMemo(() => {
    if (selectedIngredients && selectedIngredients.length > 0) {
      return selectedIngredients
        .filter(ing => ing.itemId !== null)
        .map((ing, index) => ({
          id: `imported-${index}-${Date.now()}`,
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
  }, []);

  const [ingredients, setIngredients] = React.useState<RecipeIngredientWithId[]>(initialIngredients);
  const [instructions, setInstructions] = React.useState<RecipeStep[]>(importedRecipe?.instructions || [{ text: '', duration: null }]);
  const [tags, setTags] = React.useState<string[]>([]);
  const [newTag, setNewTag] = React.useState('');
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
  }, []);
  const [ingredientStepMap, setIngredientStepMap] = React.useState<{[ingredientId: string]: number[]}>(initialStepMap);
  const [imageUrl, setImageUrl] = React.useState<string | null>(importedRecipe?.imageUrl || null);
  const [selectedImageFile, setSelectedImageFile] = React.useState<File | null>(null);
  const [sourceUrl] = React.useState<string | undefined>(importedRecipe?.sourceUrl);

  // Store imported ingredients as raw text for display (only if no selected ingredients)
  const [importedIngredients] = React.useState<string[]>(
    selectedIngredients && selectedIngredients.length > 0 ? [] : (importedRecipe?.ingredients || [])
  );

  // Clear any existing errors when component mounts
  React.useEffect(() => {
    clearError();
  }, [clearError]);

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
    if (!selectedHouseholdId || !user?.id) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('messages.error.missingHouseholdOrUserInformation'),
        variant: "destructive",
      });
      return;
    }

    // An ingredient is valid if it has an item AND either a positive quantity OR
    // is explicitly marked as a free-quantity ("à l'œil") entry.
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

    // Transform ingredients and add step mapping
    const ingredientsForApi: CreateRecipeIngredientDto[] = validIngredients.map(ingredient => ({
      itemId: ingredient.itemId,
      quantity: ingredient.isFreeQuantity ? null : ingredient.quantity,
      unit: ingredient.unit,
      isFreeQuantity: Boolean(ingredient.isFreeQuantity),
      notes: ingredient.notes,
      usedInSteps: ingredientStepMap[ingredient.id] || []
    }));

    const recipeData = {
      title: data.title,
      description: data.description,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      servings: data.servings,
      difficulty: data.difficulty,
      instructions: filteredInstructions,
      tags,
      sourceUrl,
      // image is uploaded after create
      ingredients: ingredientsForApi,
    };

    try {
      // Clear any existing errors before creating the recipe
      clearError();
      
      const newRecipe = await createRecipe(recipeData);

      // Handle image upload after recipe creation:
      // 1) If the user selected a local image file, upload that
      // 2) Otherwise, if we have an imported image URL, import it to Cloudinary
      if (selectedImageFile) {
        try {
          const uploadedImageUrl = await uploadImageWithSignature('recipes', selectedImageFile);
          await useRecipeStore.getState().updateRecipe(newRecipe.id, { imageUrl: uploadedImageUrl });
        } catch (e) {
          // Non-fatal: recipe is created without image
          console.error('Deferred image upload failed:', e);
        }
      } else if (imageUrl) {
        try {
          // If the image is not already a Cloudinary URL, import it
          const isCloudinary = imageUrl.includes('res.cloudinary.com');
          const finalImageUrl = isCloudinary
            ? imageUrl
            : await uploadImageFromUrl('recipes', imageUrl);

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
          description: error instanceof Error ? error.message : t('messages.error.failedToCreateRecipe'),
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
              onClick={() => navigate('/recipes')}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              { isMobile ? '' : t('pages.recipes.backToRecipes')}
            </Button>
            <h1 className="text-xl font-bold text-foreground">{t('pages.recipes.addNewRecipe')}</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle>{t('pages.recipes.basicInformation')}</CardTitle>
                <CardDescription>{t('pages.recipes.basicInformationDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ImageUpload
                  currentImageUrl={imageUrl}
                  onImageUpload={setImageUrl}
                  onImageRemove={() => { setImageUrl(null); setSelectedImageFile(null); }}
                  folder="recipes"
                  label={t('pages.recipes.recipeImage')}
                  description={t('pages.recipes.recipeImageDescription')}
                  deferUpload
                  onImageSelected={(file) => { setSelectedImageFile(file); }}
                />

                <FormField
                  control={form.control}
                  name="title"
                  rules={{ required: t('messages.error.recipeTitleRequired') }}
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
                  rules={{ required: t('messages.error.descriptionRequired') }}
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* Imported Ingredients Reference */}
            {importedIngredients.length > 0 && (
              <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-amber-800 dark:text-amber-200">
                    {t('pages.importRecipe.importedIngredients')}
                  </CardTitle>
                  <CardDescription className="text-amber-700 dark:text-amber-300">
                    {t('pages.importRecipe.importedIngredientsDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                    {importedIngredients.map((ing, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Structured Ingredients */}
            <StructuredIngredientInput
              ingredients={ingredients}
              onIngredientsChange={(structuredIngredients) => {
                const ingredientsWithId = structuredIngredients.map((ingredient) => ({
                  ...ingredient,
                  id: ingredient.id || `temp-${Date.now()}-${Math.random()}`
                } as RecipeIngredientWithId));
                setIngredients(ingredientsWithId);
                
                // Clean up ingredient-step mappings for deleted ingredients
                const currentIngredientIds = ingredientsWithId.map(ing => ing.id);
                const updatedMap = { ...ingredientStepMap };
                Object.keys(updatedMap).forEach(ingredientId => {
                  if (!currentIngredientIds.includes(ingredientId)) {
                    delete updatedMap[ingredientId];
                  }
                });
                setIngredientStepMap(updatedMap);
              }}
            />

            {/* Instructions */}
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
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
                      <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-foreground rounded-full flex items-center justify-center text-sm font-medium mt-2">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder={t('pages.recipes.stepInstructionsPlaceholder', { step: index + 1 })}
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
                                {ingredients.map((ingredient) => {
                                  const isLinked = (ingredientStepMap[ingredient.id] || []).includes(index);
                                  const itemName = getItemDisplayName(ingredient.item, t);
                                  const label = formatQuantityWithUnit(ingredient.quantity, ingredient.unit, t, {
                                    item: ingredient.item,
                                    itemName,
                                    isFreeQuantity: ingredient.isFreeQuantity,
                                  });
                                  return (
                                    <div key={ingredient.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={isLinked}
                                        onCheckedChange={() => toggleIngredientForStep(ingredient.id, index)}
                                      />
                                      <span className="text-sm text-muted-foreground">
                                        {label} {itemName}
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
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
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
                onClick={() => navigate('/recipes')}
                className="flex-1"
              >
                {t('buttons.cancel')}
              </Button>
              <Button 
                type="submit" 
                variant="green"
                className="flex-1"
                disabled={loading}
              >
                {loading ? t('pages.recipes.saving') : t('pages.recipes.saveRecipe')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AddRecipe;
