
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardLinkOverlay, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Heart, Clock, Users, ChefHat, Download } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import { useRecipeStore } from '@/stores/recipeStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { RecipeListDto } from '@/services/recipeService';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { scrollRevealFadeUp } from '@/lib/motion';

const Recipes = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedHouseholdId } = useProtectedRoute();
  const [searchParamsHook, setSearchParamsHook] = useSearchParams();
  const filterItemId = searchParamsHook.get('itemId');
  const filterItemName = searchParamsHook.get('itemName');
  const {
    recipes,
    favoriteRecipes,
    loading,
    error,
    total,
    fetchRecipes,
    fetchFavoriteRecipes,
    toggleFavorite,
    clearError,
  } = useRecipeStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (selectedHouseholdId) {
      fetchRecipes(filterItemId ? { itemId: filterItemId } : undefined);
      fetchFavoriteRecipes();
    }
  }, [selectedHouseholdId, filterItemId, fetchRecipes, fetchFavoriteRecipes]);

  const clearIngredientFilter = () => {
    const next = new URLSearchParams(searchParamsHook);
    next.delete('itemId');
    next.delete('itemName');
    setSearchParamsHook(next, { replace: true });
  };

  useEffect(() => {
    if (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: error,
        variant: 'destructive',
      });
      clearError();
    }
  }, [error, toast, clearError]);

  const currentRecipes = activeTab === 'favorites' ? favoriteRecipes : recipes;
  
  const filteredRecipes = (currentRecipes || []).filter(recipe => {
    const searchLower = searchQuery.toLowerCase();
    return recipe.title.toLowerCase().includes(searchLower) ||
           (recipe.description && recipe.description.toLowerCase().includes(searchLower)) ||
           (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchLower)));
  });

  const handleToggleFavorite = async (recipeId: string) => {
    if (!selectedHouseholdId) return;
    
    try {
      await toggleFavorite(recipeId);
      toast({
        title: t('messages.success.recipeUpdated'),
        description: t('pages.recipes.recipeUpdated'),
      });
    } catch (error) {
      toast({
        title: t('messages.error.somethingWentWrong'),
        description: t('pages.recipes.updateFailed'),
        variant: 'destructive',
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Note: Household checks are handled by useProtectedRoute hook

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground">{t('pages.recipes.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {loading ? t('common.loading') : t('pages.recipes.recipeSaved', { count: total || 0 })}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => navigate('/import-recipe')}
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('pages.importRecipe.import')}</span>
              </Button>
              <Button
                variant="green"
                onClick={() => navigate('/add-recipe')}
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('pages.recipes.addRecipe')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t('pages.recipes.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card/80 backdrop-blur-sm border-0 shadow-lg"
          />
        </div>

        {/* Active ingredient filter */}
        {filterItemId && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearIngredientFilter}
            className="bg-card/80 backdrop-blur-sm"
          >
            {t('pages.recipes.filteredByIngredient', { name: filterItemName ?? '' })}
            <X className="h-3 w-3 ml-2" />
          </Button>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-card/80 backdrop-blur-sm">
            <TabsTrigger value="all">{t('pages.recipes.allRecipes')}</TabsTrigger>
            <TabsTrigger value="favorites">{t('pages.recipes.favorites')}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <RecipeGridSkeleton />
            ) : (
              <RecipeGrid 
                activeTab={activeTab}
                recipes={filteredRecipes} 
                onToggleFavorite={handleToggleFavorite} 
                getDifficultyColor={getDifficultyColor} 
              />
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            {loading ? (
              <RecipeGridSkeleton />
            ) : (
              <RecipeGrid 
                activeTab={activeTab}
                recipes={filteredRecipes} 
                onToggleFavorite={handleToggleFavorite} 
                getDifficultyColor={getDifficultyColor} 
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation currentPage="recipes" />
    </div>
  );
};

interface RecipeGridProps {
  activeTab: string;
  recipes: RecipeListDto[];
  onToggleFavorite: (id: string) => void;
  getDifficultyColor: (difficulty: string) => string;
}

const RecipeGrid = ({ activeTab, recipes, onToggleFavorite, getDifficultyColor }: RecipeGridProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const prefersReducedMotion = useReducedMotion() ?? false;

  // Handle undefined or null recipes
  if (!recipes || recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{t('pages.recipes.noRecipes')}</p>
      </div>
    );
  }

  return (
    <div key={activeTab} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {recipes.map((recipe) => (
        <motion.div key={recipe.id} {...scrollRevealFadeUp(prefersReducedMotion)} className="relative isolate">
          <CardLinkOverlay
            aria-label={recipe.title}
            onClick={() => navigate(`/recipes/${recipe.id}`)}
          />
          <Card
            variant="elevated"
            className="overflow-hidden pointer-events-none [&_button]:pointer-events-auto [&_button]:relative [&_button]:z-10"
          >
            {recipe.imageUrl && (
              <div className="w-full h-40 overflow-hidden bg-muted">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle as="h3">{recipe.title}</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {recipe.description}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(recipe.id);
                  }}
                  className="ml-2 relative z-10 pointer-events-auto"
                  aria-label={recipe.isFavorite ? t('pages.recipes.unfavorite') : t('pages.recipes.favorite')}
                >
                  <Heart
                    className={`h-4 w-4 ${recipe.isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                  />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)}m</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{recipe.servings || 0}</span>
                </div>
              </div>

              {recipe.creator && (
                <p className="text-xs text-muted-foreground mb-3">
                  {t('common.addedBy', {
                    name: recipe.creator.id === currentUser?.id
                      ? t('common.you')
                      : recipe.creator.displayName,
                  })}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  <Badge className={getDifficultyColor(recipe.difficulty)}>
                    {t(`pages.recipes.difficultyOptions.${recipe.difficulty.toLowerCase()}`)}
                  </Badge>
                  {(recipe.tags || []).slice(0, 2).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

const RecipeGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} variant="elevated">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
              <Skeleton className="h-6 w-6 rounded-full ml-2" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4 mb-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-8" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Recipes;
