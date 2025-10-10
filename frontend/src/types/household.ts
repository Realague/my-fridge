import { StorageAreaType } from './enums';

export interface StorageArea {
  name: string;
  description?: string;
  emoji: string;
  type: StorageAreaType;
}

export interface CreateHouseholdRequest {
  name: string;
  description?: string;
  storageAreas?: StorageArea[];
}