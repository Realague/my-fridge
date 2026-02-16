import { useStoredItemStore } from '@/stores/storedItemStore';
import { useItemMinimumStore } from '@/stores/itemMinimumStore';
import { useShoppingStore } from '@/stores/shoppingStore';
import { itemService } from './itemService';
import { toast } from 'sonner';

/**
 * Centralized service for handling item deletion across all stores
 * This ensures that when an item is deleted, all references to it are removed
 * from stored items, item minimums, shopping lists, meal plans, and recipes.
 */
export class ItemDeletionService {
  /**
   * Delete an item and clean up all references across all stores
   * @param itemId - The ID of the item to delete
   * @param householdId - The household ID
   * @param itemName - The name of the item (for user feedback)
   * @param successMessage - Translated success message
   * @param successDescription - Translated success description
   */
  static async deleteItem(
    itemId: string, 
    householdId: string, 
    itemName: string,
    successMessage: string,
    successDescription: string
  ): Promise<void> {
    try {
      // Delete the item from the backend
      await itemService.deleteItem(itemId, householdId);
      
      // Clean up all stores that reference this item
      this.cleanupStores(itemId);
      
      // Show success message
      toast.success(successMessage, {
        description: successDescription,
      });
    } catch (error) {
      console.error('Failed to delete item:', error);
      throw error;
    }
  }

  /**
   * Clean up all stores that reference the deleted item
   * @param itemId - The ID of the item that was deleted
   */
  private static cleanupStores(itemId: string): void {
    try {
      // Clean up stored items
      const storedItemStore = useStoredItemStore.getState();
      storedItemStore.removeStoredItemsByItemId(itemId);

      // Clean up item minimums
      const itemMinimumStore = useItemMinimumStore.getState();
      itemMinimumStore.removeItemMinimumsByItemId(itemId);

      // Clean up shopping items
      const shoppingStore = useShoppingStore.getState();
      shoppingStore.removeShoppingItemsByItemId(itemId);
    } catch (error) {
      console.error('Error cleaning up stores after item deletion:', error);
      // Don't throw here - the item was already deleted from the backend
    }
  }

  /**
   * Get the count of references to an item across all stores
   * This can be used to show users how many places reference an item before deletion
   * @param itemId - The ID of the item to check
   * @returns Object with counts of references in each store
   */
  static getItemReferenceCounts(itemId: string): {
    storedItems: number;
    itemMinimums: number;
    shoppingItems: number;
    total: number;
  } {
    const storedItemStore = useStoredItemStore.getState();
    const itemMinimumStore = useItemMinimumStore.getState();
    const shoppingStore = useShoppingStore.getState();

    const storedItems = storedItemStore.getStoredItemsForHousehold().filter(
      item => item.itemId === itemId
    ).length;

    const itemMinimums = itemMinimumStore.getItemMinimumsForHousehold().filter(
      minimum => minimum.itemId === itemId
    ).length;

    const shoppingItems = shoppingStore.items.filter(
      item => item.item?.id === itemId
    ).length;

    return {
      storedItems,
      itemMinimums,
      shoppingItems,
      total: storedItems + itemMinimums + shoppingItems,
    };
  }

  /**
   * Check if an item can be safely deleted (no references)
   * @param itemId - The ID of the item to check
   * @returns true if the item has no references and can be safely deleted
   */
  static canDeleteItem(itemId: string): boolean {
    const counts = this.getItemReferenceCounts(itemId);
    return counts.total === 0;
  }

  /**
   * Get a human-readable summary of what will be affected by item deletion
   * @param itemId - The ID of the item to check
   * @param translations - Object containing translated strings
   * @returns A string describing what will be removed
   */
  static getDeletionImpactSummary(itemId: string, translations: {
    storedItems: (count: number) => string;
    itemMinimums: (count: number) => string;
    shoppingItems: (count: number) => string;
    noReferencesFound: string;
    deletionImpactSummary: (impacts: string) => string;
  }): string {
    const counts = this.getItemReferenceCounts(itemId);
    const impacts: string[] = [];

    if (counts.storedItems > 0) {
      impacts.push(translations.storedItems(counts.storedItems));
    }
    if (counts.itemMinimums > 0) {
      impacts.push(translations.itemMinimums(counts.itemMinimums));
    }
    if (counts.shoppingItems > 0) {
      impacts.push(translations.shoppingItems(counts.shoppingItems));
    }

    if (impacts.length === 0) {
      return translations.noReferencesFound;
    }

    return translations.deletionImpactSummary(impacts.join(', '));
  }
}
