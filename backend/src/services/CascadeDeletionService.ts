import { Transaction } from 'sequelize';
import { 
  Recipe, 
  RecipeIngredient, 
  StoredItem, 
  ShoppingItem, 
  StorageArea, 
  Item, 
  MealPlan, 
  HouseholdMember 
} from '../models';
import sequelize from '../config/database';
import { deleteImageFromCloudinary } from '../utils/imageUploader';

export class CascadeDeletionService {
  
  /**
   * Deletes all entities related to a household in the correct order
   * to maintain referential integrity
   */
  async deleteHouseholdCascade(householdId: string, transaction?: Transaction): Promise<void> {
    if (!householdId) {
      throw new Error('Household ID is required for cascade deletion');
    }

    const t = transaction || await sequelize.transaction();
    
    try {
      // Step 1: Delete meal plans (references recipes)
      await this.deleteMealPlans(householdId, t);
      
      // Step 2: Delete recipe ingredients (references recipes and items)
      await this.deleteRecipeIngredients(householdId, t);
      
      // Step 3: Delete recipes
      await this.deleteRecipes(householdId, t);
      
      // Step 4: Delete stored items (references items and storage areas)
      await this.deleteStoredItems(householdId, t);
      
      // Step 5: Delete shopping items (references items)
      await this.deleteShoppingItems(householdId, t);
      
      // Step 6: Delete storage areas
      await this.deleteStorageAreas(householdId, t);
      
      // Step 7: Delete custom household items (keep global items)
      await this.deleteHouseholdItems(householdId, t);
      
      // Step 8: Delete household members
      await this.deleteHouseholdMembers(householdId, t);
      
      // If we created the transaction, commit it
      if (!transaction) {
        await t.commit();
      }
      
    } catch (error) {
      console.error(`Error during cascade deletion for household ${householdId}:`, error);
      // If we created the transaction, rollback on error
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }
  
  /**
   * Delete all meal plans for the household
   */
  private async deleteMealPlans(householdId: string, transaction: Transaction): Promise<void> {
    const deletedCount = await MealPlan.destroy({
      where: { householdId },
      transaction
    });
    
    console.log(`Deleted ${deletedCount} meal plans for household ${householdId}`);
  }
  
  /**
   * Delete all recipe ingredients for recipes in the household
   */
  private async deleteRecipeIngredients(householdId: string, transaction: Transaction): Promise<void> {
    // First get all recipe IDs for this household
    const recipes = await Recipe.findAll({
      where: { householdId },
      attributes: ['id'],
      transaction
    });
    
    const recipeIds = recipes.map(recipe => recipe.id);
    
    if (recipeIds.length > 0) {
      const deletedCount = await RecipeIngredient.destroy({
        where: { 
          recipeId: recipeIds 
        },
        transaction
      });
      
      console.log(`Deleted ${deletedCount} recipe ingredients for household ${householdId}`);
    }
  }
  
  /**
   * Delete all recipes for the household
   */
  private async deleteRecipes(householdId: string, transaction: Transaction): Promise<void> {
    // First, get all recipes to delete their images
    const recipes = await Recipe.findAll({
      where: { householdId },
      attributes: ['id', 'imageUrl'],
      transaction
    });
    
    // Delete images from Cloudinary
    for (const recipe of recipes) {
      if (recipe.imageUrl) {
        try {
          await deleteImageFromCloudinary(recipe.imageUrl);
        } catch (error) {
          // Log error but don't fail the deletion if image deletion fails
          console.error(`Failed to delete image for recipe ${recipe.id}:`, error);
        }
      }
    }
    
    // Then delete the recipes from database
    const deletedCount = await Recipe.destroy({
      where: { householdId },
      transaction
    });
    
    console.log(`Deleted ${deletedCount} recipes for household ${householdId}`);
  }
  
  /**
   * Delete all stored items for the household
   */
  private async deleteStoredItems(householdId: string, transaction: Transaction): Promise<void> {
    const deletedCount = await StoredItem.destroy({
      where: { householdId },
      transaction
    });
    
    console.log(`Deleted ${deletedCount} stored items for household ${householdId}`);
  }
  
  /**
   * Delete all shopping items for the household
   */
  private async deleteShoppingItems(householdId: string, transaction: Transaction): Promise<void> {
    const deletedCount = await ShoppingItem.destroy({
      where: { householdId },
      transaction
    });
    
    console.log(`Deleted ${deletedCount} shopping items for household ${householdId}`);
  }
  
  /**
   * Delete all storage areas for the household
   */
  private async deleteStorageAreas(householdId: string, transaction: Transaction): Promise<void> {
    const deletedCount = await StorageArea.destroy({
      where: { householdId },
      transaction
    });
    
    console.log(`Deleted ${deletedCount} storage areas for household ${householdId}`);
  }
  
  /**
   * Delete custom items created specifically for this household
   * Keep global items (items with householdId = null or items used by other households)
   */
  private async deleteHouseholdItems(householdId: string, transaction: Transaction): Promise<void> {
    // First, get all items to delete their images
    const items = await Item.findAll({
      where: { 
        householdId: householdId 
      },
      attributes: ['id', 'imageUrl'],
      transaction
    });
    
    // Delete images from Cloudinary
    for (const item of items) {
      if (item.imageUrl) {
        try {
          await deleteImageFromCloudinary(item.imageUrl);
        } catch (error) {
          // Log error but don't fail the deletion if image deletion fails
          console.error(`Failed to delete image for item ${item.id}:`, error);
        }
      }
    }
    
    // Then delete the items from database
    const deletedCount = await Item.destroy({
      where: { 
        householdId: householdId 
      },
      transaction
    });
    
    console.log(`Deleted ${deletedCount} custom items for household ${householdId}`);
  }
  
  /**
   * Delete all household memberships (soft delete by setting isActive to false)
   */
  private async deleteHouseholdMembers(householdId: string, transaction: Transaction): Promise<void> {
    const [updatedCount] = await HouseholdMember.update(
      { isActive: false },
      {
        where: { 
          householdId,
          isActive: true 
        },
        transaction
      }
    );
    
    console.log(`Deactivated ${updatedCount} household memberships for household ${householdId}`);
  }
  
  /**
   * Check if household has any related data that would be deleted
   */
  async hasRelatedData(householdId: string): Promise<boolean> {
    const summary = await this.getDeletionSummary(householdId);
    return Object.values(summary).some(count => count > 0);
  }

  /**
   * Get a summary of what would be deleted (for confirmation purposes)
   */
  async getDeletionSummary(householdId: string): Promise<{
    mealPlans: number;
    recipes: number;
    storedItems: number;
    shoppingItems: number;
    storageAreas: number;
    customItems: number;
    members: number;
  }> {
    const [
      mealPlansCount,
      recipesCount,
      storedItemsCount,
      shoppingItemsCount,
      storageAreasCount,
      customItemsCount,
      membersCount
    ] = await Promise.all([
      MealPlan.count({ where: { householdId } }),
      Recipe.count({ where: { householdId } }),
      StoredItem.count({ where: { householdId } }),
      ShoppingItem.count({ where: { householdId } }),
      StorageArea.count({ where: { householdId } }),
      Item.count({ where: { householdId } }),
      HouseholdMember.count({ where: { householdId, isActive: true } })
    ]);
    
    return {
      mealPlans: mealPlansCount,
      recipes: recipesCount,
      storedItems: storedItemsCount,
      shoppingItems: shoppingItemsCount,
      storageAreas: storageAreasCount,
      customItems: customItemsCount,
      members: membersCount
    };
  }
}
