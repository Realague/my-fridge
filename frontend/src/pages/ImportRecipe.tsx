import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft, Download, Users, ChefHat, ExternalLink, Loader2, Check, X,
  ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Search, Link as LinkIcon,
  Globe, ClipboardPaste, CheckCircle2, Circle, Unlink, RotateCcw, SquarePen,
  Timer, Flame, Gauge, Carrot, ListOrdered, Clock, Sparkles, Tag,
} from 'lucide-react';
import {
  useRecipeService, ParsedImportedRecipe, MatchedIngredient, IngredientMatch,
  RecipeImportError, RecipeImportErrorCode,
} from '@/services/recipeService';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useIsMobile } from '@/hooks/use-mobile';
import { ItemSelector } from '@/components/ItemSelector';
import { Item } from '@/services/itemService';
import { getItemDisplayName } from '@/utils/itemUtils';
import { difficultyTone, confidenceTone, toneBadgeClass } from '@/lib/tokenMaps';

interface SelectedIngredient {
  originalText: string;
  quantity: number | null;
  unit: string | null;
  isFreeQuantity: boolean;
  itemId: string | null;
  itemName: string | null;
  translatedName: string | null;
  availableUnits: string[];
}

type Screen = 'url' | 'loading' | 'error' | 'review';

const LOADING_STEP_COUNT = 4;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').slice(0, 40);
  }
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const ImportRecipe = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { importRecipe } = useRecipeService();

  // Protected route hook handles auth and household checks
  useProtectedRoute();

  const [screen, setScreen] = useState<Screen>('url');
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState(false);
  const [importErrorCode, setImportErrorCode] = useState<RecipeImportErrorCode | null>(null);
  const [loadStep, setLoadStep] = useState(0);
  const [parsedRecipe, setParsedRecipe] = useState<ParsedImportedRecipe | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [expandedIngredients, setExpandedIngredients] = useState<Set<number>>(new Set());
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);

  // Cosmetic progress checklist while the import call runs.
  useEffect(() => {
    if (screen !== 'loading') {
      setLoadStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadStep((step) => Math.min(step + 1, LOADING_STEP_COUNT - 1));
    }, 700);
    return () => clearInterval(interval);
  }, [screen]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setUrlError(false);
      }
    } catch {
      // Clipboard unavailable (permissions) — user keeps typing manually.
      document.getElementById('url')?.focus();
    }
  };

  const handleImport = async () => {
    const trimmed = url.trim();
    if (!trimmed || !isValidHttpUrl(trimmed)) {
      setUrlError(true);
      return;
    }
    setUrlError(false);
    setScreen('loading');

    try {
      const recipe = await importRecipe(trimmed);
      setParsedRecipe(recipe);

      // Initialize selected ingredients from matched results
      const initialSelected: SelectedIngredient[] = recipe.matchedIngredients.map((mi: MatchedIngredient) => ({
        originalText: mi.parsed.originalText,
        quantity: mi.parsed.quantity,
        unit: mi.parsed.unit,
        isFreeQuantity: Boolean(mi.parsed.isFreeQuantity),
        itemId: mi.bestMatch?.itemId || null,
        itemName: mi.bestMatch?.itemName || null,
        translatedName: mi.bestMatch?.translatedName || null,
        availableUnits: mi.bestMatch?.availableUnits || [],
      }));
      setSelectedIngredients(initialSelected);
      setExpandedIngredients(new Set());
      setSearchingIndex(null);
      setScreen('review');

      toast({
        title: t('messages.success.recipeImported'),
        description: t('pages.importRecipe.recipeImportedDescription'),
      });
    } catch (error) {
      console.error('Import failed:', error);
      setImportErrorCode(error instanceof RecipeImportError ? error.code : 'UNKNOWN');
      setScreen('error');
    }
  };

  const resetToUrl = () => {
    setParsedRecipe(null);
    setSelectedIngredients([]);
    setImportErrorCode(null);
    setScreen('url');
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

    const filteredWithIndex = selectedIngredients
      .map((ing, originalIndex) => ({ ...ing, originalIndex }))
      .filter(ing => ing.itemId !== null);

    navigate('/add-recipe', {
      state: {
        importedRecipe: parsedRecipe,
        selectedIngredients: filteredWithIndex,
        ingredientStepMapping: parsedRecipe.ingredientStepMapping,
      }
    });
  };

  const getConfidenceColor = (confidence: number) => toneBadgeClass(confidenceTone(confidence));

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return t('pages.importRecipe.highConfidence');
    if (confidence >= 0.5) return t('pages.importRecipe.mediumConfidence');
    return t('pages.importRecipe.lowConfidence');
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

  const unmatchedIngredients = parsedRecipe?.matchedIngredients
    .map((mi, index) => ({ ...mi, index }))
    .filter((_, index) => !selectedIngredients[index]?.itemId) || [];

  const errorDescriptionKey = (): string => {
    switch (importErrorCode) {
      case 'SOURCE_NOT_ALLOWED':
      case 'ROBOTS_DISALLOWED':
        return 'pages.importRecipe.errorBlocked';
      case 'FETCH_FAILED':
        return 'pages.importRecipe.errorFetch';
      case 'NO_RECIPE_FOUND':
      default:
        return 'pages.importRecipe.errorNoRecipe';
    }
  };

  const loadingSteps = [
    t('pages.importRecipe.loadStepFetch'),
    t('pages.importRecipe.loadStepMeta'),
    t('pages.importRecipe.loadStepIngredients'),
    t('pages.importRecipe.loadStepInstructions'),
  ];

  // ─── Screen: URL input ───
  const renderUrlScreen = () => (
    <div className="flex justify-center pt-4 md:pt-12">
      <Card variant="elevated" className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mf-orange-soft">
              <LinkIcon className="h-5 w-5 text-mf-orange" />
            </span>
            <div>
              <div>{t('pages.importRecipe.heroTitle')}</div>
              <CardDescription className="mt-1 font-normal">
                {t('pages.importRecipe.heroDescription')}
              </CardDescription>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="url">{t('pages.importRecipe.recipeUrl')}</Label>
            <div className={`flex items-center gap-2 rounded-md border bg-background px-3 ${urlError ? 'border-destructive' : 'border-input'}`}>
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                id="url"
                type="url"
                placeholder="https://www.marmiton.org/…"
                value={url}
                autoComplete="off"
                onChange={(e) => { setUrl(e.target.value); setUrlError(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                className="flex-1 border-0 px-0 shadow-none focus-visible:ring-0"
              />
              <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" onClick={handlePaste}>
                <ClipboardPaste className="h-4 w-4 mr-1" />
                {t('pages.importRecipe.paste')}
              </Button>
            </div>
            {urlError && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {url.trim() ? t('pages.importRecipe.invalidUrl') : t('pages.importRecipe.urlRequired')}
              </p>
            )}
          </div>
          <Button variant="green" className="w-full" onClick={handleImport} disabled={!url.trim()}>
            <Download className="h-4 w-4 mr-2" />
            {t('pages.importRecipe.import')}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {t('pages.importRecipe.shareHint')}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Screen: loading ───
  const renderLoadingScreen = () => (
    <div className="flex flex-col items-center pt-8 md:pt-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mf-green-soft">
        <ChefHat className="h-8 w-8 text-mf-green animate-pulse" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-foreground">{t('pages.importRecipe.loadingTitle')}</h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        {t('pages.importRecipe.loadingDescription')}
      </p>
      <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
        <Globe className="h-4 w-4" />
        {hostOf(url)}
      </span>
      <div className="mt-6 h-1.5 w-64 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-mf-green transition-all duration-500"
          style={{ width: `${((loadStep + 1) / LOADING_STEP_COUNT) * 100}%` }}
        />
      </div>
      <ul className="mt-6 space-y-2 text-left">
        {loadingSteps.map((label, index) => (
          <li
            key={index}
            className={`flex items-center gap-2 text-sm ${
              index < loadStep
                ? 'text-mf-green'
                : index === loadStep
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
            }`}
          >
            {index < loadStep ? (
              <CheckCircle2 className="h-4 w-4 text-mf-green" />
            ) : index === loadStep ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            {label}
          </li>
        ))}
      </ul>
    </div>
  );

  // ─── Screen: error ───
  const renderErrorScreen = () => (
    <div className="flex flex-col items-center pt-8 md:pt-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mf-warning-soft">
        <Unlink className="h-8 w-8 text-mf-warning" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-foreground">{t('pages.importRecipe.errorTitle')}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{t(errorDescriptionKey())}</p>
      <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-mf-warning-soft px-3 py-1 text-sm text-mf-warning">
        <Unlink className="h-4 w-4" />
        {hostOf(url) || t('pages.importRecipe.invalidLink')}
      </span>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button variant="green" onClick={resetToUrl}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('pages.importRecipe.tryAnotherUrl')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/add-recipe')}>
          <SquarePen className="h-4 w-4 mr-2" />
          {t('pages.importRecipe.enterManually')}
        </Button>
      </div>
    </div>
  );

  // ─── Screen: review ───
  const renderMetaBubble = (
    icon: React.ReactNode,
    value: React.ReactNode,
    label: string,
    tone: string
  ) => (
    <div className={`flex flex-col items-center rounded-xl px-3 py-2 ${tone}`}>
      {icon}
      <span className="mt-1 text-sm font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );

  const renderReviewScreen = () => {
    if (!parsedRecipe) return null;
    return (
      <div className="space-y-6">
        {/* Source line */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Download className="h-4 w-4" />
          {t('pages.importRecipe.importedFrom')}{' '}
          <a
            href={parsedRecipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          >
            {parsedRecipe.sourceDomain || hostOf(parsedRecipe.sourceUrl)}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {parsedRecipe.extractionMethod === 'html-fallback' && (
          <div className="flex items-start gap-2 rounded-lg border border-mf-warning/30 bg-mf-warning-soft/60 px-4 py-3 text-sm text-mf-warning">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {t('pages.importRecipe.fallbackNotice')}
          </div>
        )}

        {/* Header: photo + text + meta */}
        <Card variant="elevated" className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="shrink-0 md:w-64">
                {parsedRecipe.imageUrl ? (
                  <img
                    src={parsedRecipe.imageUrl}
                    alt={parsedRecipe.title}
                    className="h-44 w-full rounded-xl object-cover md:h-48"
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center rounded-xl bg-mf-green-soft md:h-48">
                    <ChefHat className="h-10 w-10 text-mf-green" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold text-foreground">{parsedRecipe.title}</h2>
                {parsedRecipe.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{parsedRecipe.description}</p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {renderMetaBubble(
                    <Timer className="h-4 w-4 text-mf-blue" />,
                    `${parsedRecipe.prepTime} min`,
                    t('pages.importRecipe.metaPrep'),
                    'bg-mf-blue-soft'
                  )}
                  {renderMetaBubble(
                    <Flame className="h-4 w-4 text-mf-orange" />,
                    `${parsedRecipe.cookTime} min`,
                    t('pages.importRecipe.metaCook'),
                    'bg-mf-orange-soft'
                  )}
                  {renderMetaBubble(
                    <Users className="h-4 w-4 text-mf-green" />,
                    parsedRecipe.servings,
                    t('pages.importRecipe.metaServings'),
                    'bg-mf-green-soft'
                  )}
                  {renderMetaBubble(
                    <Gauge className="h-4 w-4 text-mf-warning" />,
                    <Badge className={toneBadgeClass(difficultyTone(parsedRecipe.difficulty))}>
                      {getDifficultyLabel(parsedRecipe.difficulty)}
                    </Badge>,
                    t('pages.importRecipe.metaDifficulty'),
                    'bg-mf-warning-soft/60'
                  )}
                </div>
                {(parsedRecipe.tags?.length ?? 0) > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {parsedRecipe.tags!.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {/* Ingredients panel */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mf-green-soft">
                  <Carrot className="h-5 w-5 text-mf-green" />
                </span>
                {t('pages.importRecipe.ingredientsTitle')}
                <Badge variant="secondary">{totalCount}</Badge>
              </CardTitle>
              <CardDescription>{t('pages.importRecipe.ingredientsSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recap */}
              <div className="rounded-lg bg-muted/60 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {unmatchedCount > 0 && (
                    <span className="flex items-center gap-1 font-medium text-mf-warning">
                      <AlertCircle className="h-4 w-4" />
                      {t('pages.importRecipe.recapUnmatched', { count: unmatchedCount })}
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-medium text-mf-green">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('pages.importRecipe.recapMatched', { count: matchedCount })}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  {unmatchedCount === 0 ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      {t('pages.importRecipe.recapAllMatched')}
                    </>
                  ) : (
                    t('pages.importRecipe.recapHelp')
                  )}
                </p>
              </div>

              {/* Unmatched shortcuts */}
              {unmatchedCount > 0 && (
                <ul className="space-y-1 text-sm">
                  {unmatchedIngredients.map(({ parsed, index }) => (
                    <li key={index} className="flex items-center gap-2 text-mf-warning">
                      <span>•</span>
                      <span className="flex-1 truncate">{parsed.originalText}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-mf-warning/40 hover:bg-mf-warning-soft"
                        onClick={() => {
                          setSearchingIndex(index);
                          setExpandedIngredients(prev => new Set([...prev, index]));
                          document.getElementById(`ingredient-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        <Search className="h-3 w-3 mr-1" />
                        {t('pages.importRecipe.searchItem')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

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
                            ? 'border-mf-green/30 bg-mf-green-soft/60'
                            : 'border-mf-warning/30 bg-mf-warning-soft/60'
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
                                <SelectItem value="g">{t('units.g')}</SelectItem>
                                <SelectItem value="kg">{t('units.kg')}</SelectItem>
                                <SelectItem value="ml">{t('units.ml')}</SelectItem>
                                <SelectItem value="cl">{t('units.cl')}</SelectItem>
                                <SelectItem value="l">{t('units.l')}</SelectItem>
                                <SelectItem value="tbsp">{t('units.tbsp')}</SelectItem>
                                <SelectItem value="tsp">{t('units.tsp')}</SelectItem>
                                <SelectItem value="piece">{t('units.piece')}</SelectItem>
                                <SelectItem value="pinch">{t('units.pinch')}</SelectItem>
                                <SelectItem value="drizzle">{t('units.drizzle')}</SelectItem>
                                <SelectItem value="knob">{t('units.knob')}</SelectItem>
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
                                    <Check className="h-4 w-4 text-mf-green flex-shrink-0" />
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
                                    className="flex-1 bg-background border border-mf-warning/40 rounded-md px-3 py-2 h-9 flex items-center gap-2 cursor-pointer hover:bg-mf-warning-soft"
                                    onClick={() => {
                                      setSearchingIndex(index);
                                      setExpandedIngredients(prev => new Set([...prev, index]));
                                    }}
                                  >
                                    <AlertCircle className="h-4 w-4 text-mf-warning" />
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

          {/* Steps panel */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mf-orange-soft">
                  <ListOrdered className="h-5 w-5 text-mf-orange" />
                </span>
                {t('pages.importRecipe.stepsTitle')}
                <Badge variant="secondary">
                  {t('pages.importRecipe.stepsCount', { count: parsedRecipe.instructions.length })}
                </Badge>
              </CardTitle>
              <CardDescription>{t('pages.importRecipe.stepsSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {parsedRecipe.instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-mf-green text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground">{instruction.text}</p>
                      {instruction.duration != null && instruction.duration > 0 && (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground/80">
                          <Clock className="h-3 w-3" />
                          {Math.round(instruction.duration / 60)} min
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Action bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center">
          {unmatchedCount > 0 ? (
            <span className="flex items-center gap-2 text-sm font-medium text-mf-warning">
              <AlertTriangle className="h-4 w-4" />
              {t('pages.importRecipe.reviewWarnings', { count: unmatchedCount })}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm font-medium text-mf-green">
              <CheckCircle2 className="h-4 w-4" />
              {t('pages.importRecipe.recapAllMatched')}
            </span>
          )}
          <div className="flex flex-1 justify-end gap-3">
            <Button variant="outline" onClick={resetToUrl}>
              <X className="h-4 w-4 mr-2" />
              {t('buttons.cancel')}
            </Button>
            <Button variant="green" onClick={handleCreateRecipe}>
              <Check className="h-4 w-4 mr-2" />
              {t('pages.importRecipe.createRecipe')} ({t('pages.recipes.ingredientCount', { count: matchedCount })})
            </Button>
          </div>
        </div>
      </div>
    );
  };

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

      <div className="container mx-auto px-4 py-6">
        {screen === 'url' && renderUrlScreen()}
        {screen === 'loading' && renderLoadingScreen()}
        {screen === 'error' && renderErrorScreen()}
        {screen === 'review' && renderReviewScreen()}
      </div>
    </div>
  );
};

export default ImportRecipe;
