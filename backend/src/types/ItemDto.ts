import { ItemCategory, Unit } from './enums';

export interface CreateItemDto {
  name: string;
  category: ItemCategory;
  defaultUnit?: Unit;
  availableUnits?: Unit[];
  daysAfterOpening?: number;
  imageUrl?: string;
  createdBy: string | null;
  householdId: string | null;
}

export interface UpdateItemDto {
  name?: string;
  category?: ItemCategory;
  emoji?: string;
  defaultUnit?: Unit;
  availableUnits?: Unit[];
  daysAfterOpening?: number;
  imageUrl?: string;
}

export interface ItemDto {
  id: string;
  name: string;
  category: ItemCategory;
  defaultUnit: Unit;
  availableUnits: Unit[];
  daysAfterOpening?: number;
  imageUrl: string | null;
  createdBy: string | null;
  householdId: string | null;
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
}

export interface UpdateShoppingItemDto {
  quantity?: number;
  unit?: string;
  completed?: boolean;
  priority?: number;
  storedItemId?: string | null;
}

export interface ShoppingItemDto {
  id: string;
  item: ItemDto | null;
  householdId: string;
  quantity: number;
  unit: string;
  completed: boolean;
  priority: number;
  storedItemId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetShoppingItemsQueryDto {
  householdId: string;
  completed?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateStoredItemDto {
  itemId: string;
  storageAreaId: string;
  quantity: number;
  unit: Unit;
  expirationDate?: string; // ISO date string
  location?: string;
  isOpened?: boolean;
  openedDate?: string; // ISO date string
  householdId: string;
  createdBy: string;
}

export interface UpdateStoredItemDto {
  quantity?: number;
  unit?: Unit;
  expirationDate?: string; // ISO date string
  location?: string;
  isOpened?: boolean;
  openedDate?: string; // ISO date string
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