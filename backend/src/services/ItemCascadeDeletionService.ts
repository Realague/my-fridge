import { Transaction } from 'sequelize';
import { 
  StoredItem, 
  ShoppingItem, 
  RecipeIngredient,
  Recipe,
  Item
} from '../models';
import sequelize from '../config/database';
import { deleteImageFromCloudinary } from '../utils/imageUploader';

export class ItemCascadeDeletionService {
  
  /**
   * Deletes an item and all its related entities in the correct order
   * to maintain referential integrity
   */
  async deleteItemCascade(itemId: string, transaction?: Transaction): Promise<void> {
    if (!itemId) {
      throw new Error('Item ID is required for cascade deletion');
    }

    const t = transaction || await sequelize.transaction();
    
    try {
      // Step 1: Delete stored items (references items)
      await this.deleteStoredItems(itemId, t);
      
      // Step 2: Delete shopping items (references items)
      await this.deleteShoppingItems(itemId, t);
      
      // Step 3: Update recipe instructions to remove ingredient references
      await this.updateRecipeInstructions(itemId, t);
      
      // Step 4: Delete recipe ingredients (references items)
      await this.deleteRecipeIngredients(itemId, t);
      
      // Step 5: Delete the item itself
      await this.deleteItem(itemId, t);
      
      // If we created the transaction, commit it
      if (!transaction) {
        await t.commit();
      }
      
    } catch (error) {
      console.error(`Error during cascade deletion for item ${itemId}:`, error);
      // If we created the transaction, rollback on error
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }
  
  /**
   * Delete all stored items for the item
   */
  private async deleteStoredItems(itemId: string, transaction: Transaction): Promise<void> {
    const deletedCount = await StoredItem.destroy({
      where: { 
        itemId: itemId 
      },
      transaction
    });
    
    console.log(`Deleted ${deletedCount} stored items for item ${itemId}`);
  }
  
  /**
   * Delete all shopping items for the item
   */
  private async deleteShoppingItems(itemId: string, transaction: Transaction): Promise<void> {
    const deletedCount = await ShoppingItem.destroy({
      where: { 
        itemId: itemId 
      },
      transaction
    });
    
    console.log(`Deleted ${deletedCount} shopping items for item ${itemId}`);
  }
  
  /**
   * Update recipe instructions to remove references to the deleted ingredient
   */
  private async updateRecipeInstructions(itemId: string, transaction: Transaction): Promise<void> {
    // First, get all recipe ingredients that use this item to find which recipes are affected
    const recipeIngredients = await RecipeIngredient.findAll({
      where: { itemId: itemId },
      include: [{
        model: Recipe,
        as: 'recipe',
        required: true
      }],
      transaction
    });

    if (recipeIngredients.length === 0) {
      console.log(`No recipe ingredients found for item ${itemId}`);
      return;
    }

    // Group by recipe to update each recipe's instructions
    const recipesToUpdate = new Map<string, RecipeIngredient[]>();
    
    for (const ingredient of recipeIngredients) {
      if (ingredient.recipe) {
        const recipeId = ingredient.recipe.id;
        if (!recipesToUpdate.has(recipeId)) {
          recipesToUpdate.set(recipeId, []);
        }
        recipesToUpdate.get(recipeId)!.push(ingredient);
      }
    }

    // Update each affected recipe
    for (const [recipeId, ingredients] of recipesToUpdate) {
      const firstIngredient = ingredients[0];
      if (!firstIngredient?.recipe) continue;
      
      const recipe = firstIngredient.recipe;
      
      const updatedInstructions = this.removeIngredientFromInstructions(
        recipe.instructions,
        ingredients
      );

      if (JSON.stringify(updatedInstructions) !== JSON.stringify(recipe.instructions)) {
        await Recipe.update(
          { instructions: updatedInstructions },
          { 
            where: { id: recipeId },
            transaction 
          }
        );
        console.log(`Updated instructions for recipe ${recipeId} to remove ingredient references`);
      }
    }
  }

  /**
   * Remove ingredient references from recipe instructions
   */
  private removeIngredientFromInstructions(instructions: string[], ingredients: RecipeIngredient[]): string[] {
    return instructions.map((instruction, stepIndex) => {
      let updatedInstruction = instruction;
      
      // For each ingredient that was used in this step, remove references
      for (const ingredient of ingredients) {
        if (ingredient.usedInSteps.includes(stepIndex)) {
          // Remove the ingredient name from the instruction
          // This is a simple approach - you might want to make it more sophisticated
          const ingredientName = ingredient.item?.name || 'ingredient';
          const patterns = [
            new RegExp(`\\b${ingredientName}\\b`, 'gi'),
            new RegExp(`\\b${ingredientName}s\\b`, 'gi'), // plural form
            new RegExp(`\\b${ingredientName}es\\b`, 'gi'), // plural form with 'es'
          ];
          
          for (const pattern of patterns) {
            updatedInstruction = updatedInstruction.replace(pattern, '[removed ingredient]');
          }
        }
      }
      
      return updatedInstruction;
    });
  }

  /**
   * Delete all recipe ingredients for the item
   */
  private async deleteRecipeIngredients(itemId: string, transaction: Transaction): Promise<void> {
    const deletedCount = await RecipeIngredient.destroy({
      where: { 
        itemId: itemId 
      },
      transaction
    });
    
    console.log(`Deleted ${deletedCount} recipe ingredients for item ${itemId}`);
  }
  
  /**
   * Delete the item itself
   */
  private async deleteItem(itemId: string, transaction: Transaction): Promise<void> {
    // First, get the item to check if it has an image
    const item = await Item.findByPk(itemId, { transaction });
    
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }
    
    // Delete the image from Cloudinary if it exists
    if (item.imageUrl) {
      try {
        await deleteImageFromCloudinary(item.imageUrl);
      } catch (error) {
        // Log error but don't fail the deletion if image deletion fails
        console.error(`Failed to delete image for item ${itemId}:`, error);
      }
    }
    
    // Delete the item from database
    const deletedCount = await Item.destroy({
      where: { 
        id: itemId 
      },
      transaction
    });
    
    if (deletedCount === 0) {
      throw new Error(`Failed to delete item ${itemId}`);
    }
    
    console.log(`Deleted item ${itemId}`);
  }
}
