import { Unit } from './enums';
import { ItemDto } from './ItemDto';

export interface CreateItemMinimumDto {
  itemId: string;
  householdId: string;
  minimumQuantity: number;
  minimumUnit: Unit;
  createdBy: string;
}

export interface UpdateItemMinimumDto {
  minimumQuantity?: number;
  minimumUnit?: Unit;
}

export interface ItemMinimumDto {
  id: string;
  itemId: string;
  householdId: string;
  minimumQuantity: number;
  minimumUnit: Unit;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  item?: ItemDto;
  creator?: {
    id: string;
    email: string;
  };
  household?: {
    id: string;
    name: string;
  };
}

export interface GetItemMinimumsQueryDto {
  householdId: string;
  itemId?: string;
  limit?: number;
  offset?: number;
}

export interface LowStockItemDto {
  itemMinimum: ItemMinimumDto;
  currentQuantity: number;
  currentUnit: Unit;
  quantityNeeded: number;
  isLowStock: boolean;
}
