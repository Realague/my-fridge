import { StorageAreaType, ItemCategory } from './enums';

export interface CreateStorageAreaDto {
  name: string;
  emoji?: string;
  type?: StorageAreaType;
  defaultCategories?: ItemCategory[];
  sortOrder?: number;
  householdId: string;
}

export interface UpdateStorageAreaDto {
  name?: string;
  emoji?: string;
  type?: StorageAreaType;
  defaultCategories?: ItemCategory[];
  sortOrder?: number;
}

export interface StorageAreaResponseDto {
  id: string;
  name: string;
  emoji: string;
  type: StorageAreaType;
  defaultCategories: ItemCategory[];
  sortOrder: number;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReorderStorageAreasDto {
  items: Array<{ id: string; sortOrder: number }>;
} 