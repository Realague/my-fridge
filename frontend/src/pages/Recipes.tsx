
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Heart, Clock, Users, ChefHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import { useRecipes } from '@/contexts/RecipeContext';

const Recipes = () => {
  const navigate = useNavigate();
  const { recipes, toggleFavorite } = useRecipes();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeTab === 'favorites') return matchesSearch && recipe.isFavorite;
    return matchesSearch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-orange-50 to-green-100 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Recipes</h1>
              <p className="text-sm text-gray-600">{recipes.length} recipes saved</p>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => navigate('/recipes/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Recipe
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search recipes, ingredients, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/80 backdrop-blur-sm border-0 shadow-lg"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="all">All Recipes</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <RecipeGrid recipes={filteredRecipes} onToggleFavorite={toggleFavorite} getDifficultyColor={getDifficultyColor} />
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            <RecipeGrid recipes={filteredRecipes} onToggleFavorite={toggleFavorite} getDifficultyColor={getDifficultyColor} />
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation currentPage="recipes" />
    </div>
  );
};

interface RecipeGridProps {
  recipes: any[];
  onToggleFavorite: (id: string) => void;
  getDifficultyColor: (difficulty: string) => string;
}

const RecipeGrid = ({ recipes, onToggleFavorite, getDifficultyColor }: RecipeGridProps) => {
  const navigate = useNavigate();

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No recipes found</p>
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
                <span>{recipe.prepTime + recipe.cookTime}m</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{recipe.servings}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                <Badge className={getDifficultyColor(recipe.difficulty)}>
                  {recipe.difficulty}
                </Badge>
                {recipe.tags.slice(0, 2).map((tag, index) => (
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

export default Recipes;
