import { ItemCategory, Unit } from './enums';

export interface CreateItemDto {
  name: string;
  category: ItemCategory;
  defaultUnit?: Unit;
  availableUnits?: Unit[];
  createdBy: string | null;
  householdId: string | null;
}

export interface UpdateItemDto {
  name?: string;
  category?: ItemCategory;
  emoji?: string;
  defaultUnit?: Unit;
  availableUnits?: Unit[];
}

export interface ItemDto {
  id: string;
  name: string;
  category: ItemCategory;
  defaultUnit: Unit;
  availableUnits: Unit[];
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
  limit?: number;
  offset?: number;
}

export interface CreateShoppingItemDto {
  itemId: string;
  householdId: string;
  quantity: string;
  unit: string;
  createdBy: string;
  priority?: number;
}

export interface UpdateShoppingItemDto {
  quantity?: string;
  unit?: string;
  completed?: boolean;
  priority?: number;
}

export interface ShoppingItemDto {
  id: string;
  item: ItemDto | null;
  householdId: string;
  quantity: string;
  unit: string;
  completed: boolean;
  priority: number;
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