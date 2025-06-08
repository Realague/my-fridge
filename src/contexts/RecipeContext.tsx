
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: string[];
  instructions: string[];
  tags: string[];
  image?: string;
  isFavorite: boolean;
  createdAt: Date;
}

interface RecipeContextType {
  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => void;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  toggleFavorite: (id: string) => void;
  getRecipeById: (id: string) => Recipe | undefined;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const useRecipes = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
};

const sampleRecipes: Recipe[] = [
  {
    id: '1',
    title: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta dish with eggs, cheese, and pancetta',
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: 'Medium',
    ingredients: [
      '400g spaghetti',
      '200g pancetta or guanciale',
      '4 large eggs',
      '100g Pecorino Romano cheese',
      'Black pepper',
      'Salt'
    ],
    instructions: [
      'Bring a large pot of salted water to boil and cook spaghetti until al dente',
      'While pasta cooks, dice pancetta and cook in a large pan until crispy',
      'In a bowl, whisk eggs with grated cheese and black pepper',
      'Drain pasta, reserving 1 cup pasta water',
      'Add hot pasta to pan with pancetta, remove from heat',
      'Quickly stir in egg mixture, adding pasta water as needed',
      'Serve immediately with extra cheese and pepper'
    ],
    tags: ['Italian', 'Pasta', 'Quick', 'Dinner'],
    isFavorite: true,
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2',
    title: 'Chicken Stir Fry',
    description: 'Quick and healthy stir fry with fresh vegetables',
    prepTime: 15,
    cookTime: 10,
    servings: 3,
    difficulty: 'Easy',
    ingredients: [
      '500g chicken breast, sliced',
      '2 bell peppers',
      '1 onion',
      '2 carrots',
      '3 cloves garlic',
      '2 tbsp soy sauce',
      '1 tbsp sesame oil',
      '1 tsp ginger',
      'Green onions for garnish'
    ],
    instructions: [
      'Cut all vegetables into bite-sized pieces',
      'Heat oil in a large wok or pan over high heat',
      'Add chicken and cook until golden brown',
      'Add vegetables and stir fry for 3-4 minutes',
      'Add garlic, ginger, and soy sauce',
      'Cook for another 2 minutes until vegetables are tender-crisp',
      'Garnish with green onions and serve over rice'
    ],
    tags: ['Asian', 'Healthy', 'Quick', 'Chicken'],
    isFavorite: false,
    createdAt: new Date('2024-01-20')
  }
];

export const RecipeProvider = ({ children }: { children: ReactNode }) => {
  const [recipes, setRecipes] = useState<Recipe[]>(sampleRecipes);

  const addRecipe = (recipeData: Omit<Recipe, 'id' | 'createdAt'>) => {
    const newRecipe: Recipe = {
      ...recipeData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setRecipes(prev => [newRecipe, ...prev]);
  };

  const updateRecipe = (id: string, updates: Partial<Recipe>) => {
    setRecipes(prev => prev.map(recipe => 
      recipe.id === id ? { ...recipe, ...updates } : recipe
    ));
  };

  const deleteRecipe = (id: string) => {
    setRecipes(prev => prev.filter(recipe => recipe.id !== id));
  };

  const toggleFavorite = (id: string) => {
    setRecipes(prev => prev.map(recipe => 
      recipe.id === id ? { ...recipe, isFavorite: !recipe.isFavorite } : recipe
    ));
  };

  const getRecipeById = (id: string) => {
    return recipes.find(recipe => recipe.id === id);
  };

  return (
    <RecipeContext.Provider value={{
      recipes,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      toggleFavorite,
      getRecipeById,
    }}>
      {children}
    </RecipeContext.Provider>
  );
};
