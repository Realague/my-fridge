import { Unit } from './enums';
import { RecipeDifficulty } from '../models/Recipe';

export interface RecipeIngredientDto {
  id: string;
  itemId: string;
  quantity: number;
  unit: Unit;
  notes?: string;
  usedInSteps?: number[];
  item?: {
    id: string;
    name: string;
    category: string;
    defaultUnit: string;
    availableUnits: string[];
  };
}

export interface CreateRecipeIngredientDto {
  itemId: string;
  quantity: number;
  unit: Unit;
  notes?: string;
  usedInSteps?: number[];
}

export interface CreateRecipeDto {
  title: string;
  description?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  instructions: string[];
  tags: string[];
  image?: string;
  ingredients: CreateRecipeIngredientDto[];
  householdId: string;
  createdBy: string;
}

export interface UpdateRecipeDto {
  title?: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: RecipeDifficulty;
  instructions?: string[];
  tags?: string[];
  image?: string;
  isFavorite?: boolean;
  ingredients?: CreateRecipeIngredientDto[];
}

export interface RecipeDto {
  id: string;
  title: string;
  description: string | null;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  instructions: string[];
  tags: string[];
  image: string | null;
  isFavorite: boolean;
  householdId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredientDto[];
  creator?: {
    id: string;
    displayName: string;
    email: string;
  };
}

export interface RecipeListDto {
  id: string;
  title: string;
  description: string | null;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  tags: string[];
  image: string | null;
  isFavorite: boolean;
  createdBy: string;
  createdAt: string;
  ingredientCount: number;
  creator?: {
    id: string;
    displayName: string;
  };
}

export interface RecipeSearchParams {
  search?: string;
  difficulty?: RecipeDifficulty;
  tags?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  maxTotalTime?: number;
  isFavorite?: boolean;
  createdBy?: string;
  limit?: number;
  offset?: number;
} 