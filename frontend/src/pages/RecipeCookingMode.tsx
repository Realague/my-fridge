import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Clock, ChefHat, Eye, EyeOff, ExternalLink, UtensilsCrossed, Minus, Plus } from 'lucide-react';
import { useRecipeStore } from '@/stores/recipeStore';
import { useTimerStore } from '@/stores/timerStore';
import { useTimerTick } from '@/hooks/useTimerTick';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useTranslation } from 'react-i18next';
import { getItemDisplayName } from '@/utils/itemUtils';
import { Item } from '@/services/itemService';
import { ConsumeIngredientsDialog } from '@/components/ConsumeIngredientsDialog';
import { FloatingTimerBar } from '@/components/cooking/FloatingTimerBar';
import { requestNotificationPermission } from '@/utils/timerNotifications';

const TIME_PATTERN = /(\d+)\s*(minutes?|mins?|seconds?|secs?|hours?|hrs?|heures?|min)\b/i;

function parseTimeFromText(text: string): number | null {
  const match = text.match(TIME_PATTERN);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit.startsWith('h')) return value * 3600;
  if (unit.startsWith('s')) return value;
  return value * 60;
}

const RecipeCookingMode = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const { selectedHouseholdId } = useProtectedRoute();
  const { currentRecipe: recipe, fetchRecipeById, loading, error } = useRecipeStore();
  const timerStore = useTimerStore();

  // Drive the interval that calls tick()
  useTimerTick();

  const servingsParam = searchParams.get('servings');
  const [cookingServings, setCookingServings] = useState<number | null>(null);

  useEffect(() => {
    if (recipe && cookingServings === null) {
      const fromUrl = servingsParam ? parseInt(servingsParam, 10) : NaN;
      setCookingServings(isNaN(fromUrl) || fromUrl < 1 ? recipe.servings : fromUrl);
    }
  }, [recipe, cookingServings, servingsParam]);

  const scale = recipe ? (cookingServings ?? recipe.servings) / recipe.servings : 1;

  useEffect(() => {
    if (selectedHouseholdId && id && (!recipe || recipe.id !== id)) {
      fetchRecipeById(id);
    }
  }, [selectedHouseholdId, id, recipe, fetchRecipeById]);

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
  const [checkedIngredients, setCheckedIngredients] = useState<boolean[]>([]);
  const [showIngredients, setShowIngredients] = useState(true);
  const [showConsumeDialog, setShowConsumeDialog] = useState(false);

  useEffect(() => {
    if (recipe) {
      setCompletedSteps(new Array(recipe.instructions.length).fill(false));
      setCheckedIngredients(new Array(recipe.ingredients.length).fill(false));
    }
  }, [recipe]);

  const scaleQty = (qty: number) => {
    const scaled = qty * scale;
    return Math.round(scaled * 100) / 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

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

  const progress = ((currentStep + 1) / recipe.instructions.length) * 100;

  const nextStep = () => {
    if (currentStep < recipe.instructions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleStepComplete = () => {
    const newCompleted = [...completedSteps];
    newCompleted[currentStep] = !newCompleted[currentStep];
    setCompletedSteps(newCompleted);
  };

  const toggleIngredient = (index: number) => {
    const newChecked = [...checkedIngredients];
    newChecked[index] = !newChecked[index];
    setCheckedIngredients(newChecked);
  };

  const getRelevantIngredients = (stepIndex: number) => {
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

  const relevantIngredients = getRelevantIngredients(currentStep);

  // Determine the suggested timer for the current step
  const currentInstruction = recipe.instructions[currentStep];
  const explicitDuration = currentInstruction?.duration;
  const detectedDuration = explicitDuration == null ? parseTimeFromText(currentInstruction?.text ?? '') : null;
  const suggestedSeconds = explicitDuration ?? detectedDuration;
  const isExplicit = explicitDuration != null && explicitDuration > 0;

  const handleStartStepTimer = (seconds: number) => {
    requestNotificationPermission();
    timerStore.start(seconds, {
      label: t('pages.recipes.step', { step: currentStep + 1 }),
      recipeId: recipe.id,
      stepIndex: currentStep,
    });
  };

  const formatSuggestion = (seconds: number) => {
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return m > 0 ? `${h}h${m}m` : `${h}h`;
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m${s}s` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate(`/recipes/${recipe.id}`)}
              className="text-muted-foreground shrink-0"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('pages.recipes.exitCooking')}</span>
            </Button>
            <div className="flex items-center gap-2 shrink-0">
              {recipe.sourceUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('pages.importRecipe.viewOriginal')}
                </Button>
              )}
              <ChefHat className="h-5 w-5 text-primary" />
              <span className="font-medium text-foreground hidden sm:inline">{t('pages.recipes.cookingMode')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Recipe Title & Progress */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-foreground mb-4">{recipe.title}</h1>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('pages.recipes.currentStepCount', { currentStep: currentStep + 1, instructionsLength: recipe.instructions.length })}</span>
                <span>{Math.round(progress)}% {t('pages.recipes.complete')}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Step */}
          <div className="lg:col-span-2">
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    {t('pages.recipes.step', { step: currentStep + 1 })}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={completedSteps[currentStep]}
                      onCheckedChange={toggleStepComplete}
                    />
                    <span className="text-sm text-muted-foreground">{t('pages.recipes.complete')}</span>
                  </div>
                </div>

                <p className="text-lg leading-relaxed text-foreground mb-6">
                  {currentInstruction?.text}
                </p>

                {/* Step Timer Suggestion */}
                {suggestedSeconds != null && suggestedSeconds > 0 && (
                  <div className="mb-6">
                    <Button
                      variant={isExplicit ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStartStepTimer(suggestedSeconds)}
                      className={isExplicit ? '' : 'border-dashed'}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {t('pages.recipes.startStepTimer', { duration: formatSuggestion(suggestedSeconds) })}
                    </Button>
                  </div>
                )}

                {/* Ingredients needed for this step */}
                {relevantIngredients.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">
                      {t('pages.recipes.ingredientsForThisStep')}
                    </h3>
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                      {relevantIngredients.map((ingredientIndex) => {
                        const ingredient = recipe.ingredients[ingredientIndex];
                        return (
                          <div key={ingredient.id} className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                            <span className="font-medium text-foreground">
                              {scaleQty(ingredient.quantity)} {ingredient.unit !== 'piece' ? ingredient.unit : ''} {getItemDisplayName(ingredient?.item as Item, t)}
                            </span>
                            {ingredient.notes && (
                              <span className="text-muted-foreground italic">({ingredient.notes})</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      size="lg"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t('common.previous')}
                    </Button>
                  )}

                  {currentStep < recipe.instructions.length - 1 && (
                    <Button
                      onClick={nextStep}
                      size="lg"
                    >
                      {t('common.next')}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ingredients Sidebar */}
          <div>
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">{t('pages.recipes.allIngredients')}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowIngredients(!showIngredients)}
                  >
                    {showIngredients ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>

                {showIngredients && (
                  <div className="space-y-3">
                    {recipe.ingredients.map((ingredient, index) => {
                      const isRelevant = relevantIngredients.includes(index);
                      return (
                        <div
                          key={ingredient.id}
                          className={`flex items-start gap-2 p-2 rounded ${
                            isRelevant ? 'bg-primary/10 border border-primary/20' : ''
                          }`}
                        >
                          <Checkbox
                            checked={checkedIngredients[index]}
                            onCheckedChange={() => toggleIngredient(index)}
                            className="mt-1"
                          />
                          <div className={`flex-1 text-sm ${checkedIngredients[index] ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            <div className={`font-medium ${isRelevant ? 'text-primary' : ''}`}>
                              {scaleQty(ingredient.quantity)} {ingredient.unit !== 'piece' ? ingredient.unit : ''} {getItemDisplayName(ingredient?.item as Item, t)}
                            </div>
                            {ingredient.notes && (
                              <div className={`text-xs ${isRelevant ? 'text-primary' : 'text-muted-foreground'}`}>
                                {ingredient.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recipe Info */}
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg mt-4">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3">{t('pages.recipes.basicInformation')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('pages.recipes.prepTime')}:</span>
                    <span className="font-medium">{recipe.prepTime}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('pages.recipes.cookTime')}:</span>
                    <span className="font-medium">{recipe.cookTime}m</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('pages.recipes.servings')}:</span>
                    <div className="flex items-center gap-1">
                      <button
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted transition-colors"
                        onClick={() => setCookingServings(Math.max(1, (cookingServings ?? recipe.servings) - 1))}
                        disabled={(cookingServings ?? recipe.servings) <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-medium w-6 text-center tabular-nums">{cookingServings ?? recipe.servings}</span>
                      <button
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted transition-colors"
                        onClick={() => setCookingServings((cookingServings ?? recipe.servings) + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('pages.recipes.difficulty')}:</span>
                    <span className="font-medium">{t(`pages.recipes.difficultyOptions.${recipe.difficulty.toLowerCase()}`)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Completion Message */}
        {currentStep === recipe.instructions.length - 1 && completedSteps[currentStep] && (
          <Card className="bg-primary/10 border-primary/20 mt-6">
            <CardContent className="p-6 text-center">
              <ChefHat className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('pages.recipes.congratulations')}</h2>
              <p className="text-muted-foreground mb-4">{t('pages.recipes.congratulationsDescription', { recipeTitle: recipe.title })}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => setShowConsumeDialog(true)}>
                  <UtensilsCrossed className="h-4 w-4 mr-2" />
                  {t('pages.recipes.consume.button')}
                </Button>
                <Button variant="green" onClick={() => navigate(`/recipes/${recipe.id}`)}>
                  {t('pages.recipes.backToRecipes')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consume Ingredients Dialog */}
        <ConsumeIngredientsDialog
          isOpen={showConsumeDialog}
          onClose={() => setShowConsumeDialog(false)}
          recipe={recipe}
          initialServings={cookingServings ?? undefined}
        />
      </div>

      {/* Floating Timer Bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-4 z-50 pointer-events-none">
        <div className="container mx-auto max-w-4xl pointer-events-auto">
          <FloatingTimerBar />
        </div>
      </div>
    </div>
  );
};

export default RecipeCookingMode;
