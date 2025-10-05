import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Play, Pause, RotateCcw, Clock, ChefHat, Badge, Eye, EyeOff } from 'lucide-react';
import { useRecipeStore } from '@/stores/recipeStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useTranslation } from 'react-i18next'; 
import { getItemDisplayName } from '@/utils/itemUtils';
import { Item } from '@/services/itemService';

const RecipeCookingMode = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Protected route hook handles auth and household checks
  const { selectedHouseholdId } = useProtectedRoute();
  
  const { currentRecipe: recipe, fetchRecipeById, loading, error } = useRecipeStore();

  // Fetch the recipe when component mounts
  useEffect(() => {
    if (selectedHouseholdId && id && (!recipe || recipe.id !== id)) {
      fetchRecipeById(id);
    }
  }, [selectedHouseholdId, id, recipe, fetchRecipeById]);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
  const [checkedIngredients, setCheckedIngredients] = useState<boolean[]>([]);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showIngredients, setShowIngredients] = useState(true);

  useEffect(() => {
    if (recipe) {
      setCompletedSteps(new Array(recipe.instructions.length).fill(false));
      setCheckedIngredients(new Array(recipe.ingredients.length).fill(false));
    }
  }, [recipe]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer(timer - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Show error or not found state
  if (!recipe || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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

  const progress = ((currentStep + 1) / recipe.instructions.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = (minutes: number) => {
    setTimer(minutes * 60);
    setIsTimerRunning(true);
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setTimer(0);
    setIsTimerRunning(false);
  };

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

  // Function to get relevant ingredients for current step - now uses explicit mappings
  const getRelevantIngredients = (stepIndex: number) => {
    const relevantIngredients: number[] = [];
    
    recipe.ingredients.forEach((ingredient, index) => {
      // First check if there's explicit step mapping
      if (ingredient.usedInSteps && ingredient.usedInSteps.includes(stepIndex)) {
        relevantIngredients.push(index);
        return;
      }
      
      // Fallback to text matching if no explicit mapping
      if (!ingredient.usedInSteps || ingredient.usedInSteps.length === 0) {
        const stepText = recipe.instructions[stepIndex].toLowerCase();
        
        // Also check ingredient notes for matches
        if (ingredient.notes && stepText.includes(ingredient.notes.toLowerCase())) {
          relevantIngredients.push(index);
        }
      }
    });
    
    return relevantIngredients;
  };

  const relevantIngredients = getRelevantIngredients(currentStep);

  return (
    <div className="min-h-screen bg-background">
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
              {t('pages.recipes.exitCooking')}
            </Button>
            <div className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-green-600" />
              <span className="font-medium text-gray-900">{t('pages.recipes.cookingMode')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Recipe Title & Progress */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{recipe.title}</h1>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('pages.recipes.currentStepCount', { currentStep: currentStep + 1, instructionsLength: recipe.instructions.length })}</span>
                <span>{Math.round(progress)}% {t('pages.recipes.complete')}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Timer Controls */}
        {timer > 0 && (
          <Card className="bg-orange-50 border-orange-200 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="text-2xl font-bold text-orange-800">{formatTime(timer)}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={toggleTimer}>
                    {isTimerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetTimer}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Timer Buttons */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2">{t('pages.recipes.quickTimers')}</span>
              {[1, 5, 10, 15, 20, 30].map((mins) => (
                <Button
                  key={mins}
                  variant="outline"
                  size="sm"
                  onClick={() => startTimer(mins)}
                  className="text-xs"
                >
                  {mins}m
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Step */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {t('pages.recipes.step', { step: currentStep + 1 })}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={completedSteps[currentStep]}
                      onCheckedChange={toggleStepComplete}
                    />
                    <span className="text-sm text-gray-600">{t('pages.recipes.complete')}</span>
                  </div>
                </div>
                
                <p className="text-lg leading-relaxed text-gray-800 mb-6">
                  {recipe.instructions[currentStep]}
                </p>

                {/* Ingredients needed for this step */}
                {relevantIngredients.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-green-700 mb-3 uppercase tracking-wide">
                      {t('pages.recipes.ingredientsForThisStep')}
                    </h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                      {relevantIngredients.map((ingredientIndex) => {
                        const ingredient = recipe.ingredients[ingredientIndex];
                        return (
                          <div key={ingredient.id} className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="font-medium text-green-800">
                              {ingredient.quantity} {ingredient.unit} {getItemDisplayName(ingredient?.item as Item, t)}
                            </span>
                            {ingredient.notes && (
                              <span className="text-green-600 italic">({ingredient.notes})</span>
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
                    disabled={currentStep === 0}
                    size="lg"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('common.previous')}
                  </Button>
                  )}
                  
                  {currentStep < recipe.instructions.length - 1 && (
                  <Button
                    onClick={nextStep}
                    disabled={currentStep === recipe.instructions.length - 1}
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
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">{t('pages.recipes.allIngredients')}</h3>
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
                            isRelevant ? 'bg-green-50 border border-green-200' : ''
                          }`}
                        >
                          <Checkbox
                            checked={checkedIngredients[index]}
                            onCheckedChange={() => toggleIngredient(index)}
                            className="mt-1"
                          />
                          <div className={`flex-1 text-sm ${checkedIngredients[index] ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                            <div className={`font-medium ${isRelevant ? 'text-green-800' : ''}`}>
                              {ingredient.quantity} {ingredient.unit} {getItemDisplayName(ingredient?.item as Item, t)}
                            </div>
                            {ingredient.notes && (
                              <div className={`text-xs ${isRelevant ? 'text-green-600' : 'text-gray-600'}`}>
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
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mt-4">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{t('pages.recipes.basicInformation')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('pages.recipes.prepTime')}:</span>
                    <span className="font-medium">{recipe.prepTime}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('pages.recipes.cookTime')}:</span>
                    <span className="font-medium">{recipe.cookTime}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('pages.recipes.servings')}:</span>
                    <span className="font-medium">{recipe.servings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('pages.recipes.difficulty')}:</span>
                    <span className="font-medium">{t(`pages.recipes.difficultyOptions.${recipe.difficulty.toLowerCase()}`)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Completion Message */}
        {currentStep === recipe.instructions.length - 1 && completedSteps[currentStep] && (
          <Card className="bg-green-50 border-green-200 mt-6">
            <CardContent className="p-6 text-center">
              <ChefHat className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">{t('pages.recipes.congratulations')}</h2>
              <p className="text-green-700 mb-4">{t('pages.recipes.congratulationsDescription', { recipeTitle: recipe.title })}</p>
              <Button onClick={() => navigate(`/recipes/${recipe.id}`)}>
                {t('pages.recipes.backToRecipes')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RecipeCookingMode;

