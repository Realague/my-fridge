import { Op, WhereOptions, Transaction } from 'sequelize';
import sequelize from '../config/database';
import { Recipe, RecipeCreationAttributes } from '../models/Recipe';
import { RecipeIngredient } from '../models/RecipeIngredient';
import { Item } from '../models/Item';
import { User } from '../models/User';
import { RecipeSearchParams } from '../types/RecipeDto';
import { deleteImageFromCloudinary } from '../utils/imageUploader';

export class RecipeRepository {
  
  async findByHousehold(
    householdId: string, 
    params: RecipeSearchParams = {}
  ): Promise<{ recipes: Recipe[]; total: number }> {
    const {
      search,
      difficulty,
      tags,
      maxPrepTime,
      maxCookTime,
      maxTotalTime,
      isFavorite,
      createdBy,
      itemId,
      limit = 20,
      offset = 0
    } = params;

    // Build where conditions
    const whereConditions: WhereOptions = {
      householdId,
    };

    if (search) {
      whereConditions[Op.or as any] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        sequelize.where(
          sequelize.cast(sequelize.col('tags'), 'text'),
          { [Op.iLike]: `%${search}%` }
        )
      ];
    }

    if (difficulty) {
      whereConditions.difficulty = difficulty;
    }

    if (tags && tags.length > 0) {
      whereConditions.tags = { [Op.overlap]: tags };
    }

    if (maxPrepTime !== undefined) {
      whereConditions.prepTime = { [Op.lte]: maxPrepTime };
    }

    if (maxCookTime !== undefined) {
      whereConditions.cookTime = { [Op.lte]: maxCookTime };
    }

    if (maxTotalTime !== undefined) {
      // For total time filtering, we'll handle this at the application level
      // since it requires a calculated field (prepTime + cookTime)
      // This is a placeholder - filtering will be done after the query
    }

    if (isFavorite !== undefined) {
      whereConditions.isFavorite = isFavorite;
    }

    if (createdBy) {
      whereConditions.createdBy = createdBy;
    }

    const ingredientInclude: Record<string, unknown> = {
      model: RecipeIngredient,
      as: 'ingredients',
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'category', 'defaultUnit', 'availableUnits']
        }
      ]
    };
    if (itemId) {
      // Filter recipes that contain this ingredient
      ingredientInclude.where = { itemId };
      ingredientInclude.required = true;
    }

    const { rows: recipes, count: total } = await Recipe.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: RecipeIngredient,
          as: 'ingredients',
          include: [
            {
              model: Item,
              as: 'item',
              attributes: ['id', 'name', 'category', 'defaultUnit', 'availableUnits', 'pieceAlias']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    return { recipes, total };
  }

  async findById(id: string, householdId: string): Promise<Recipe | null> {
    return Recipe.findOne({
      where: { id, householdId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: RecipeIngredient,
          as: 'ingredients',
          include: [
            {
              model: Item,
              as: 'item',
              attributes: ['id', 'name', 'category', 'defaultUnit', 'availableUnits', 'pieceAlias', 'householdId', 'imageUrl']
            }
          ]
        }
      ]
    });
  }
  async create(recipeData: RecipeCreationAttributes, transaction?: Transaction): Promise<Recipe> {
    return Recipe.create(recipeData, { transaction });
  }

  async update(
    id: string, 
    householdId: string, 
    updates: Partial<Recipe>, 
    transaction?: Transaction
  ): Promise<[number, Recipe[]]> {
    return Recipe.update(updates, {
      where: { id, householdId },
      returning: true,
      transaction
    });
  }

  async delete(id: string, householdId: string, transaction?: Transaction): Promise<number> {
    // First, get the recipe to check if it has an image
    const recipe = await Recipe.findOne({
      where: { id, householdId },
      attributes: ['id', 'imageUrl'],
      transaction
    });

    // Delete the image from Cloudinary if it exists
    if (recipe?.imageUrl) {
      try {
        await deleteImageFromCloudinary(recipe.imageUrl);
      } catch (error) {
        // Log error but don't fail the deletion if image deletion fails
        console.error(`Failed to delete image for recipe ${id}:`, error);
      }
    }

    return Recipe.destroy({
      where: { id, householdId },
      transaction
    });
  }

  async toggleFavorite(id: string, householdId: string): Promise<Recipe | null> {
    const recipe = await this.findById(id, householdId);
    if (!recipe) return null;

    recipe.isFavorite = !recipe.isFavorite;
    await recipe.save();
    return recipe;
  }

  async getFavorites(householdId: string): Promise<Recipe[]> {
    return Recipe.findAll({
      where: { 
        householdId, 
        isFavorite: true 
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async getRecipesByUser(householdId: string, userId: string): Promise<Recipe[]> {
    return Recipe.findAll({
      where: { 
        householdId, 
        createdBy: userId 
      },
      include: [
        {
          model: RecipeIngredient,
          as: 'ingredients'
        }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async getAllTags(householdId: string): Promise<string[]> {
    const recipes = await Recipe.findAll({
      where: { householdId },
      attributes: ['tags']
    });

    const allTags = recipes.flatMap(recipe => recipe.tags);
    return [...new Set(allTags)].sort();
  }

  async getRecipeStats(householdId: string): Promise<{
    totalRecipes: number;
    favoriteRecipes: number;
    difficultyBreakdown: { [key: string]: number };
  }> {
    const recipes = await Recipe.findAll({
      where: { householdId },
      attributes: ['difficulty', 'prepTime', 'cookTime', 'isFavorite']
    });

    const totalRecipes = recipes.length;
    const favoriteRecipes = recipes.filter(r => r.isFavorite).length;
    const averagePrepTime = recipes.reduce((sum, r) => sum + r.prepTime, 0) / totalRecipes || 0;
    const averageCookTime = recipes.reduce((sum, r) => sum + r.cookTime, 0) / totalRecipes || 0;

    const difficultyBreakdown = recipes.reduce((acc, recipe) => {
      acc[recipe.difficulty] = (acc[recipe.difficulty] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      totalRecipes,
      favoriteRecipes,
      difficultyBreakdown
    };
  }
} 