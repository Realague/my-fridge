import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Download, Clock, Users, ChefHat, ExternalLink, Loader2, Check, X, ChevronDown, ChevronUp, AlertCircle, Search } from 'lucide-react';
import { useRecipeService, ParsedMarmitonRecipe, MatchedIngredient, IngredientMatch } from '@/services/recipeService';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useIsMobile } from '@/hooks/use-mobile';
import { ItemSelector } from '@/components/ItemSelector';
import { Item } from '@/services/itemService';
import { getItemDisplayName } from '@/utils/itemUtils';

interface SelectedIngredient {
  originalText: string;
  quantity: number | null;
  unit: string | null;
  itemId: string | null;
  itemName: string | null;
  translatedName: string | null;
  availableUnits: string[];
}

const ImportRecipe = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { importFromMarmiton } = useRecipeService();
  
  // Protected route hook handles auth and household checks
  useProtectedRoute();
  
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedRecipe, setParsedRecipe] = useState<ParsedMarmitonRecipe | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [expandedIngredients, setExpandedIngredients] = useState<Set<number>>(new Set());
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);

  const handleImport = async () => {
    if (!url.trim()) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('pages.importRecipe.urlRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (!url.includes('marmiton.org')) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('pages.importRecipe.invalidUrl'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const recipe = await importFromMarmiton(url);
      setParsedRecipe(recipe);
      
      // Initialize selected ingredients from matched results
      const initialSelected: SelectedIngredient[] = recipe.matchedIngredients.map((mi: MatchedIngredient) => ({
        originalText: mi.parsed.originalText,
        quantity: mi.parsed.quantity,
        unit: mi.parsed.unit,
        itemId: mi.bestMatch?.itemId || null,
        itemName: mi.bestMatch?.itemName || null,
        translatedName: mi.bestMatch?.translatedName || null,
        availableUnits: mi.bestMatch?.availableUnits || [],
      }));
      setSelectedIngredients(initialSelected);
      
      toast({
        title: t('messages.success.recipeImported'),
        description: t('pages.importRecipe.recipeImportedDescription'),
      });
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('pages.importRecipe.importFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMatch = (index: number, match: IngredientMatch | null) => {
    setSelectedIngredients(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        itemId: match?.itemId || null,
        itemName: match?.itemName || null,
        translatedName: match?.translatedName || null,
        availableUnits: match?.availableUnits || [],
      };
      return updated;
    });
  };

  const handleManualItemSelect = (index: number, item: Item | null) => {
    setSelectedIngredients(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        itemId: item?.id || null,
        itemName: item?.name || null,
        translatedName: item ? getItemDisplayName(item, t) : null,
        availableUnits: item?.availableUnits || [],
      };
      return updated;
    });
    setSearchingIndex(null);
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    setSelectedIngredients(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity };
      return updated;
    });
  };

  const handleUpdateUnit = (index: number, unit: string) => {
    setSelectedIngredients(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unit };
      return updated;
    });
  };

  const toggleExpanded = (index: number) => {
    setExpandedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleCreateRecipe = () => {
    if (!parsedRecipe) return;
    
    // Navigate to add-recipe with the parsed data and selected ingredients
    navigate('/add-recipe', { 
      state: { 
        importedRecipe: parsedRecipe,
        selectedIngredients: selectedIngredients.filter(ing => ing.itemId !== null)
      } 
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return t('pages.importRecipe.highConfidence');
    if (confidence >= 0.5) return t('pages.importRecipe.mediumConfidence');
    return t('pages.importRecipe.lowConfidence');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return t('pages.recipes.difficultyOptions.easy');
      case 'Medium': return t('pages.recipes.difficultyOptions.medium');
      case 'Hard': return t('pages.recipes.difficultyOptions.hard');
      default: return difficulty;
    }
  };

  const matchedCount = selectedIngredients.filter(ing => ing.itemId !== null).length;
  const unmatchedCount = selectedIngredients.filter(ing => ing.itemId === null).length;
  const totalCount = selectedIngredients.length;

  // Get unmatched ingredients for the summary
  const unmatchedIngredients = parsedRecipe?.matchedIngredients
    .map((mi, index) => ({ ...mi, index }))
    .filter((_, index) => !selectedIngredients[index]?.itemId) || [];

  return (
    <div className="min-h-screen bg-background pb-20">
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
              {isMobile ? '' : t('pages.recipes.backToRecipes')}
            </Button>
            <h1 className="text-xl font-bold text-foreground">{t('pages.importRecipe.title')}</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* URL Input Card */}
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{t('pages.importRecipe.importFromMarmiton')}</CardTitle>
            <CardDescription>{t('pages.importRecipe.pasteUrl')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">{t('pages.importRecipe.recipeUrl')}</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://www.marmiton.org/recettes/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleImport} 
                  disabled={loading || !url.trim()}
                  variant="green"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('pages.importRecipe.importing')}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {t('pages.importRecipe.import')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipe Preview */}
        {parsedRecipe && (
          <>
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{parsedRecipe.title}</CardTitle>
                    {parsedRecipe.description && (
                      <CardDescription className="mt-2">{parsedRecipe.description}</CardDescription>
                    )}
                  </div>
                  <a 
                    href={parsedRecipe.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                </div>
              </CardHeader>
              
              {parsedRecipe.imageUrl && (
                <div className="px-6">
                  <img 
                    src={parsedRecipe.imageUrl} 
                    alt={parsedRecipe.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              
              <CardContent className="pt-4">
                {/* Recipe Meta */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{t('pages.recipes.prepTime')}: {parsedRecipe.prepTime} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{t('pages.recipes.cookTime')}: {parsedRecipe.cookTime} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{parsedRecipe.servings} {t('pages.recipes.servings')}</span>
                  </div>
                  <Badge className={getDifficultyColor(parsedRecipe.difficulty)}>
                    <ChefHat className="h-3 w-3 mr-1" />
                    {getDifficultyLabel(parsedRecipe.difficulty)}
                  </Badge>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">{t('pages.recipes.instructions')}</h3>
                  <ol className="space-y-3">
                    {parsedRecipe.instructions.map((instruction, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="text-muted-foreground">{instruction.text}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Summary Card - Unmatched Ingredients */}
            {unmatchedCount > 0 && (
              <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-orange-800 dark:text-orange-200 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {t('pages.importRecipe.unmatchedIngredients')} ({unmatchedCount})
                  </CardTitle>
                  <CardDescription className="text-orange-700 dark:text-orange-300">
                    {t('pages.importRecipe.unmatchedIngredientsDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-orange-800 dark:text-orange-200">
                    {unmatchedIngredients.map(({ parsed, index }) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="text-orange-600 dark:text-orange-400">•</span>
                        <span className="flex-1">{parsed.originalText}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-orange-300 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900"
                          onClick={() => {
                            setSearchingIndex(index);
                            setExpandedIngredients(prev => new Set([...prev, index]));
                            // Scroll to the ingredient
                            document.getElementById(`ingredient-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                        >
                          <Search className="h-3 w-3 mr-1" />
                          {t('pages.importRecipe.searchItem')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Matched Ingredients Card */}
            <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {t('pages.importRecipe.matchedIngredients')}
                      <Badge variant="secondary" className={`ml-2 ${matchedCount === totalCount ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}`}>
                        {matchedCount}/{totalCount}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{t('pages.importRecipe.matchedIngredientsDescription')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <div className="space-y-3">
                    {parsedRecipe.matchedIngredients.map((matchedIng, index) => {
                      const selected = selectedIngredients[index];
                      const isExpanded = expandedIngredients.has(index);
                      const hasAlternatives = matchedIng.matches.length > 1;
                      const isSearching = searchingIndex === index;
                      const hasNoMatch = !matchedIng.bestMatch && !selected?.itemId;
                      
                      return (
                        <div 
                          key={index}
                          id={`ingredient-${index}`}
                          className={`border rounded-lg p-4 transition-colors ${
                            selected?.itemId 
                              ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30'
                              : 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/30'
                          }`}
                        >
                          {/* Original ingredient text */}
                          <div className="text-sm text-muted-foreground mb-2">
                            <span className="font-medium">{t('pages.importRecipe.originalText')}:</span>{' '}
                            {matchedIng.parsed.originalText}
                          </div>
                          
                          {/* Parsed values and match selection */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            {/* Quantity */}
                            <div>
                              <Label className="text-xs text-muted-foreground">{t('pages.importRecipe.parsedQuantity')}</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={selected?.quantity ?? ''}
                                onChange={(e) => handleUpdateQuantity(index, parseFloat(e.target.value) || 0)}
                                className="h-9"
                              />
                            </div>
                            
                            {/* Unit */}
                            <div>
                              <Label className="text-xs text-muted-foreground">{t('pages.importRecipe.parsedUnit')}</Label>
                              <Select
                                value={selected?.unit || 'piece'}
                                onValueChange={(value) => handleUpdateUnit(index, value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="g">g</SelectItem>
                                  <SelectItem value="kg">kg</SelectItem>
                                  <SelectItem value="ml">ml</SelectItem>
                                  <SelectItem value="cl">cl</SelectItem>
                                  <SelectItem value="l">l</SelectItem>
                                  <SelectItem value="cup">cup</SelectItem>
                                  <SelectItem value="tbsp">tbsp</SelectItem>
                                  <SelectItem value="tsp">tsp</SelectItem>
                                  <SelectItem value="piece">piece</SelectItem>
                                  <SelectItem value="pack">pack</SelectItem>
                                  <SelectItem value="bunch">bunch</SelectItem>
                                  <SelectItem value="dozen">dozen</SelectItem>
                                  <SelectItem value="other">other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {/* Matched item */}
                            <div className="md:col-span-2">
                              <Label className="text-xs text-muted-foreground">{t('pages.importRecipe.matchedItem')}</Label>
                              <div className="flex items-center gap-2">
                                {selected?.itemId ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <div className="flex-1 bg-background border rounded-md px-3 py-2 h-9 flex items-center justify-between">
                                      <span className="text-sm truncate">
                                        {selected.translatedName}
                                      </span>
                                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                    </div>
                                    {matchedIng.bestMatch && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge className={`${getConfidenceColor(matchedIng.bestMatch.confidence)} cursor-help`}>
                                            {Math.round(matchedIng.bestMatch.confidence * 100)}%
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {t('pages.importRecipe.confidence')}: {getConfidenceLabel(matchedIng.bestMatch.confidence)}
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                    {(hasAlternatives || hasNoMatch) && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 px-2"
                                        onClick={() => toggleExpanded(index)}
                                      >
                                        {isExpanded ? (
                                          <ChevronUp className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 px-2 text-destructive hover:text-destructive"
                                      onClick={() => handleSelectMatch(index, null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex-1 flex items-center gap-2">
                                    <div 
                                      className="flex-1 bg-background border border-orange-300 dark:border-orange-700 rounded-md px-3 py-2 h-9 flex items-center gap-2 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/50"
                                      onClick={() => {
                                        setSearchingIndex(index);
                                        setExpandedIngredients(prev => new Set([...prev, index]));
                                      }}
                                    >
                                      <AlertCircle className="h-4 w-4 text-orange-500" />
                                      <span className="text-sm text-muted-foreground">
                                        {t('pages.importRecipe.noMatch')} - {t('pages.importRecipe.clickToSearch')}
                                      </span>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-9 px-2"
                                      onClick={() => {
                                        setSearchingIndex(index);
                                        setExpandedIngredients(prev => new Set([...prev, index]));
                                      }}
                                    >
                                      <Search className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Manual search or alternative matches */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border">
                              {/* Manual item search */}
                              {(isSearching || hasNoMatch) && (
                                <div className="mb-3">
                                  <Label className="text-xs text-muted-foreground mb-2 block">
                                    {t('pages.importRecipe.manualSearch')}
                                  </Label>
                                  <ItemSelector
                                    onItemSelect={(item) => handleManualItemSelect(index, item)}
                                    placeholder={t('forms.searchOrAddItem')}
                                    selectedItem={null}
                                    excludeCleaningProducts={true}
                                  />
                                </div>
                              )}
                              
                              {/* Alternative matches */}
                              {hasAlternatives && (
                                <>
                                  <Label className="text-xs text-muted-foreground mb-2 block">
                                    {t('pages.importRecipe.alternativeMatches')}
                                  </Label>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {matchedIng.matches.slice(0, 5).map((match, matchIndex) => (
                                      <Button
                                        key={matchIndex}
                                        variant={selected?.itemId === match.itemId ? 'default' : 'outline'}
                                        size="sm"
                                        className="justify-between h-auto py-2"
                                        onClick={() => handleSelectMatch(index, match)}
                                      >
                                        <span className="truncate">{match.translatedName}</span>
                                        <Badge className={`${getConfidenceColor(match.confidence)} ml-2`}>
                                          {Math.round(match.confidence * 100)}%
                                        </Badge>
                                      </Button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setParsedRecipe(null)}
                className="flex-1"
              >
                {t('buttons.cancel')}
              </Button>
              <Button 
                variant="green"
                onClick={handleCreateRecipe}
                className="flex-1"
              >
                {t('pages.importRecipe.createRecipe')} ({matchedCount} {t('pages.recipes.ingredients').toLowerCase()})
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportRecipe;
