import { Transaction } from 'sequelize';
import { RecipeIngredient } from '../models/RecipeIngredient';
import { Item } from '../models/Item';
import { CreateRecipeIngredientDto } from '../types/RecipeDto';

export class RecipeIngredientRepository {

  async findByRecipeId(recipeId: string): Promise<RecipeIngredient[]> {
    return RecipeIngredient.findAll({
      where: { recipeId },
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'category', 'defaultUnit', 'availableUnits']
        }
      ],
      order: [['createdAt', 'ASC']]
    });
  }

  async create(
    recipeId: string, 
    ingredientData: CreateRecipeIngredientDto, 
    transaction?: Transaction
  ): Promise<RecipeIngredient> {
    return RecipeIngredient.create({
      recipeId,
      ...ingredientData
    }, { transaction });
  }

  async createMany(
    recipeId: string, 
    ingredients: CreateRecipeIngredientDto[], 
    transaction?: Transaction
  ): Promise<RecipeIngredient[]> {
    const ingredientPromises = ingredients.map(ingredient => 
      this.create(recipeId, ingredient, transaction)
    );
    return Promise.all(ingredientPromises);
  }

  async delete(id: string, transaction?: Transaction): Promise<number> {
    return RecipeIngredient.destroy({
      where: { id },
      transaction
    });
  }

  async deleteByRecipeId(recipeId: string, transaction?: Transaction): Promise<number> {
    return RecipeIngredient.destroy({
      where: { recipeId },
      transaction
    });
  }

  async replaceIngredients(
    recipeId: string, 
    newIngredients: CreateRecipeIngredientDto[], 
    transaction?: Transaction
  ): Promise<RecipeIngredient[]> {
    // Delete existing ingredients
    await this.deleteByRecipeId(recipeId, transaction);
    
    // Create new ingredients
    return this.createMany(recipeId, newIngredients, transaction);
  }

  async findByItemId(itemId: string): Promise<RecipeIngredient[]> {
    return RecipeIngredient.findAll({
      where: { itemId },
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'category']
        }
      ]
    });
  }

  async getIngredientUsageStats(householdId: string): Promise<Array<{
    itemId: string;
    itemName: string;
    usageCount: number;
    totalQuantity: number;
  }>> {
    // This would require a more complex query joining with recipes table
    // For now, return a simplified version
    const ingredients = await RecipeIngredient.findAll({
      include: [
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'householdId'],
          where: { householdId }
        }
      ]
    });

    const stats = ingredients.reduce((acc, ingredient) => {
      const key = ingredient.itemId;
      if (!acc[key]) {
        acc[key] = {
          itemId: ingredient.itemId,
          itemName: ingredient.item?.name || 'Unknown',
          usageCount: 0,
          totalQuantity: 0
        };
      }
      acc[key].usageCount += 1;
      acc[key].totalQuantity += Number(ingredient.quantity);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(stats);
  }
} 