import { StorageAreaType } from './enums';

export interface CreateStorageAreaDto {
  name: string;
  emoji?: string;
  type?: StorageAreaType;
  householdId: string;
}

export interface UpdateStorageAreaDto {
  name?: string;
  emoji?: string;
  type?: StorageAreaType;
}

export interface StorageAreaResponseDto {
  id: string;
  name: string;
  emoji: string;
  type: StorageAreaType;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
} 