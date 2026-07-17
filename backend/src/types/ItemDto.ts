import { ItemCategory, Unit, ShoppingItemStatus } from './enums';

export interface CreateItemDto {
  name: string;
  category: ItemCategory;
  defaultUnit?: Unit;
  availableUnits?: Unit[];
  pieceAlias?: string | null;
  daysAfterOpening?: number;
  imageUrl?: string;
  createdBy: string | null;
  householdId: string | null;
  recipeId?: string | null;
}

export interface UpdateItemDto {
  name?: string;
  category?: ItemCategory;
  emoji?: string;
  defaultUnit?: Unit;
  availableUnits?: Unit[];
  pieceAlias?: string | null;
  daysAfterOpening?: number;
  imageUrl?: string;
  recipeId?: string | null;
}

export interface ItemDto {
  id: string;
  name: string;
  category: ItemCategory;
  defaultUnit: Unit;
  availableUnits: Unit[];
  pieceAlias: string | null;
  daysAfterOpening?: number;
  imageUrl: string | null;
  createdBy: string | null;
  householdId: string | null;
  /** Set only on cooked-meal Items linked to a recipe; absent everywhere else. */
  recipeId?: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    displayName: string;
    email: string;
  };
  household?: {
    id: string;
    name: string;
  };
}

export interface GetItemsQueryDto {
  search?: string;
  householdId?: string;
  language?: string;
  limit?: number;
  offset?: number;
}

export interface CreateShoppingItemDto {
  itemId: string;
  householdId: string;
  quantity: number;
  unit: string;
  createdBy: string;
  priority?: number;
  /**
   * Target section. Defaults to TO_BUY. Set to TO_STORE to add an item directly
   * to "À ranger" (e.g. a scanned off-list product bought in store).
   */
  status?: ShoppingItemStatus;
}

export interface UpdateShoppingItemDto {
  quantity?: number;
  unit?: string;
  status?: ShoppingItemStatus;
  priority?: number;
  storedItemId?: string | null;
}

export interface ShoppingItemDto {
  id: string;
  item: ItemDto | null;
  householdId: string;
  quantity: number;
  unit: string;
  status: ShoppingItemStatus;
  priority: number;
  storedItemId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    displayName: string;
  };
}

export interface GetShoppingItemsQueryDto {
  householdId: string;
  status?: ShoppingItemStatus;
  limit?: number;
  offset?: number;
}

export interface CreateStoredItemDto {
  // For ingredient flow: itemId is required.
  // For cooked-meal flow: itemId is omitted; articleType + name + (optional recipeId) are used to resolve/create the Item lazily.
  itemId?: string;
  storageAreaId: string;
  quantity: number;
  unit: Unit;
  expirationDate?: string; // ISO date string
  location?: string;
  isOpened?: boolean;
  openedDate?: string; // ISO date string
  householdId: string;
  createdBy: string;
  // Cooked-meal specific
  articleType?: 'ingredient' | 'cooked_meal';
  name?: string;
  recipeId?: string | null;
  cookedDate?: string; // ISO date string
}

export interface UpdateStoredItemDto {
  quantity?: number;
  unit?: Unit;
  expirationDate?: string | null; // ISO date string; null clears (e.g. when moving to freezer)
  location?: string;
  isOpened?: boolean;
  openedDate?: string; // ISO date string
  cookedDate?: string | null;
  storageAreaId?: string; // Allow moving items between storage areas
}

export interface StoredItemDto {
  id: string;
  itemId: string;
  storageAreaId: string;
  quantity: number;
  unit: Unit;
  expirationDate: string | null | undefined;
  location: string | null;
  isOpened: boolean;
  openedDate: string | null | undefined;
  frozenDate: string | null | undefined;
  cookedDate: string | null | undefined;
  householdId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  item?: ItemDto;
  storageArea?: {
    id: string;
    name: string;
    emoji: string;
    type: string;
  };
  creator?: {
    id: string;
    displayName: string;
    email: string;
  };
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  daysUntilExpiration?: number | null;
  effectiveExpirationDate?: string | null;
  daysFrozen?: number | null;
  isFrozenTooLong?: boolean;
  daysRemainingInFreezer?: number | null;
  recommendedFreezerDays?: number | null;
}

export interface GetStoredItemsQueryDto {
  householdId: string;
  storageAreaId?: string;
  itemId?: string;
  search?: string;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  limit?: number;
  offset?: number;
}

export interface BulkTransferToStorageItemDto {
  shoppingItemId: string;
  storageAreaId: string;
  expirationDate?: string;
  location?: string;
}

export interface BulkTransferToStorageDto {
  items: BulkTransferToStorageItemDto[];
  householdId: string;
  createdBy: string;
} 