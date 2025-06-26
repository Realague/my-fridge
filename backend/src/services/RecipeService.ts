import sequelize from '../config/database';
import { RecipeRepository } from '../repositories/RecipeRepository';
import { RecipeIngredientRepository } from '../repositories/RecipeIngredientRepository';
import { Recipe } from '../models/Recipe';
import { RecipeIngredient } from '../models/RecipeIngredient';
import { 
  CreateRecipeDto, 
  UpdateRecipeDto, 
  RecipeDto, 
  RecipeListDto, 
  RecipeSearchParams,
  RecipeIngredientDto 
} from '../types/RecipeDto';
import { NotFoundError, ValidationError } from '../errors/CustomErrors';

export class RecipeService {
  private recipeRepository: RecipeRepository;
  private recipeIngredientRepository: RecipeIngredientRepository;

  constructor() {
    this.recipeRepository = new RecipeRepository();
    this.recipeIngredientRepository = new RecipeIngredientRepository();
  }

  async getRecipes(
    householdId: string, 
    params: RecipeSearchParams = {}
  ): Promise<{ recipes: RecipeListDto[]; total: number; hasMore: boolean }> {
    const { recipes, total } = await this.recipeRepository.findByHousehold(householdId, params);
    
    const recipeListDtos = recipes.map(recipe => this.mapToListDto(recipe));
    const hasMore = (params.offset || 0) + recipes.length < total;

    return {
      recipes: recipeListDtos,
      total,
      hasMore
    };
  }

  async getRecipeById(id: string, householdId: string): Promise<RecipeDto> {
    const recipe = await this.recipeRepository.findById(id, householdId);
    
    if (!recipe) {
      throw new NotFoundError('Recipe not found');
    }

    return this.mapToDto(recipe);
  }

  async createRecipe(recipeData: CreateRecipeDto): Promise<RecipeDto> {
    // Validate ingredients
    if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
      throw new ValidationError('Recipe must have at least one ingredient');
    }

    const transaction = await sequelize.transaction();

    try {
      // Create the recipe
      const recipe = await this.recipeRepository.create({
        title: recipeData.title,
        description: recipeData.description || null,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        servings: recipeData.servings,
        difficulty: recipeData.difficulty,
        instructions: recipeData.instructions,
        tags: recipeData.tags,
        image: recipeData.image || null,
        householdId: recipeData.householdId,
        createdBy: recipeData.createdBy
      }, transaction);

      // Create ingredients
      await this.recipeIngredientRepository.createMany(
        recipe.id, 
        recipeData.ingredients, 
        transaction
      );

      await transaction.commit();

      // Fetch the complete recipe with ingredients
      return this.getRecipeById(recipe.id, recipeData.householdId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateRecipe(
    id: string, 
    householdId: string, 
    updates: UpdateRecipeDto
  ): Promise<RecipeDto> {
    const transaction = await sequelize.transaction();

    try {
      // Check if recipe exists
      const existingRecipe = await this.recipeRepository.findById(id, householdId);
      if (!existingRecipe) {
        throw new NotFoundError('Recipe not found');
      }

      // Update recipe data (excluding ingredients)
      const { ingredients, ...recipeUpdates } = updates;
      
      if (Object.keys(recipeUpdates).length > 0) {
        await this.recipeRepository.update(id, householdId, recipeUpdates, transaction);
      }

      // Update ingredients if provided
      if (ingredients) {
        await this.recipeIngredientRepository.replaceIngredients(
          id, 
          ingredients, 
          transaction
        );
      }

      await transaction.commit();

      // Return updated recipe
      return this.getRecipeById(id, householdId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async deleteRecipe(id: string, householdId: string): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      // Check if recipe exists
      const recipe = await this.recipeRepository.findById(id, householdId);
      if (!recipe) {
        throw new NotFoundError('Recipe not found');
      }

      // Delete ingredients first (due to foreign key constraints)
      await this.recipeIngredientRepository.deleteByRecipeId(id, transaction);
      
      // Delete recipe
      await this.recipeRepository.delete(id, householdId, transaction);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async toggleFavorite(id: string, householdId: string): Promise<RecipeDto> {
    const recipe = await this.recipeRepository.toggleFavorite(id, householdId);
    
    if (!recipe) {
      throw new NotFoundError('Recipe not found');
    }

    return this.getRecipeById(id, householdId);
  }

  async getFavoriteRecipes(householdId: string): Promise<RecipeListDto[]> {
    const recipes = await this.recipeRepository.getFavorites(householdId);
    return recipes.map(recipe => this.mapToListDto(recipe));
  }

  async getRecipesByUser(householdId: string, userId: string): Promise<RecipeListDto[]> {
    const recipes = await this.recipeRepository.getRecipesByUser(householdId, userId);
    return recipes.map(recipe => this.mapToListDto(recipe));
  }

  async getAllTags(householdId: string): Promise<string[]> {
    return this.recipeRepository.getAllTags(householdId);
  }

  async getRecipeStats(householdId: string): Promise<{
    totalRecipes: number;
    favoriteRecipes: number;
    difficultyBreakdown: { [key: string]: number };
    popularTags: Array<{ tag: string; count: number }>;
  }> {
    const [basicStats, tags] = await Promise.all([
      this.recipeRepository.getRecipeStats(householdId),
      this.recipeRepository.getAllTags(householdId)
    ]);

    // Get tag frequency
    const recipes = await this.recipeRepository.findByHousehold(householdId, { limit: 1000 });
    const tagCounts = recipes.recipes.reduce((acc, recipe) => {
      recipe.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const popularTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      ...basicStats,
      popularTags
    };
  }

  async getIngredientUsageStats(householdId: string): Promise<Array<{
    itemId: string;
    itemName: string;
    usageCount: number;
    totalQuantity: number;
  }>> {
    return this.recipeIngredientRepository.getIngredientUsageStats(householdId);
  }

  private mapToDto(recipe: Recipe): RecipeDto {
    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: recipe.getTotalTime(),
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      instructions: recipe.instructions,
      tags: recipe.tags,
      image: recipe.image,
      isFavorite: recipe.isFavorite,
      householdId: recipe.householdId,
      createdBy: recipe.createdBy,
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
      ingredients: (recipe.ingredients || []).map(this.mapIngredientToDto),
      creator: recipe.creator ? {
        id: recipe.creator.id,
        displayName: `${recipe.creator.firstName} ${recipe.creator.lastName}`,
        email: recipe.creator.email
      } : undefined
    };
  }

  private mapToListDto(recipe: Recipe): RecipeListDto {
    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      totalTime: recipe.getTotalTime(),
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      tags: recipe.tags,
      image: recipe.image,
      isFavorite: recipe.isFavorite,
      createdBy: recipe.createdBy,
      createdAt: recipe.createdAt.toISOString(),
      ingredientCount: recipe.ingredients?.length || 0,
      creator: recipe.creator ? {
        id: recipe.creator.id,
        displayName: `${recipe.creator.firstName} ${recipe.creator.lastName}`
      } : undefined
    };
  }

  private mapIngredientToDto(ingredient: RecipeIngredient): RecipeIngredientDto {
    return {
      id: ingredient.id,
      itemId: ingredient.itemId,
      quantity: Number(ingredient.quantity),
      unit: ingredient.unit,
      notes: ingredient.notes || undefined,
      usedInSteps: ingredient.usedInSteps,
      item: ingredient.item ? {
        id: ingredient.item.id,
        name: ingredient.item.name,
        category: ingredient.item.category,
        defaultUnit: ingredient.item.defaultUnit,
        availableUnits: ingredient.item.availableUnits
      } : undefined
    };
  }
} 