
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Heart, Clock, Users, ChefHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import { useRecipeStore } from '@/stores/recipeStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { RecipeListDto } from '@/services/recipeService';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

const Recipes = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedHouseholdId } = useProtectedRoute();
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
      fetchRecipes(selectedHouseholdId);
      fetchFavoriteRecipes(selectedHouseholdId);
    }
  }, [selectedHouseholdId, fetchRecipes, fetchFavoriteRecipes]);

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
  
  console.log('Recipes component state:', { 
    recipes: recipes?.length || 0, 
    favoriteRecipes: favoriteRecipes?.length || 0, 
    activeTab, 
    currentRecipes: currentRecipes?.length || 0,
    loading,
    error 
  });
  
  const filteredRecipes = (currentRecipes || []).filter(recipe => {
    const searchLower = searchQuery.toLowerCase();
    return recipe.title.toLowerCase().includes(searchLower) ||
           (recipe.description && recipe.description.toLowerCase().includes(searchLower)) ||
           (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchLower)));
  });

  const handleToggleFavorite = async (recipeId: string) => {
    if (!selectedHouseholdId) return;
    
    try {
      await toggleFavorite(selectedHouseholdId, recipeId);
      toast({
        title: t('messages.success.itemUpdated'),
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('pages.recipes.title')}</h1>
              <p className="text-sm text-gray-600">
                {loading ? t('common.loading') : t('pages.recipes.recipeSaved', { count: total || 0 })}
              </p>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => navigate('/add-recipe')}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('pages.recipes.addRecipe')}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={t('pages.recipes.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/80 backdrop-blur-sm border-0 shadow-lg"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="all">{t('pages.recipes.allRecipes')}</TabsTrigger>
            <TabsTrigger value="favorites">{t('pages.recipes.favorites')}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <RecipeGridSkeleton />
            ) : (
              <RecipeGrid 
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
  recipes: RecipeListDto[];
  onToggleFavorite: (id: string) => void;
  getDifficultyColor: (difficulty: string) => string;
}

const RecipeGrid = ({ recipes, onToggleFavorite, getDifficultyColor }: RecipeGridProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Handle undefined or null recipes
  if (!recipes || recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">{t('pages.recipes.noRecipes')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {recipes.map((recipe) => (
        <Card
          key={recipe.id}
          className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
          onClick={() => navigate(`/recipes/${recipe.id}`)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{recipe.title}</CardTitle>
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
                className="ml-2"
              >
                <Heart 
                  className={`h-4 w-4 ${recipe.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
                />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)}m</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{recipe.servings || 0}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                <Badge className={getDifficultyColor(recipe.difficulty || t('pages.recipes.easy'))}>
                  {recipe.difficulty || t('pages.recipes.easy')}
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
      ))}
    </div>
  );
};

const RecipeGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
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
