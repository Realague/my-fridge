export interface StorageArea {
  name: string;
  description?: string;
  emoji: string;
  type: 'fridge' | 'freezer' | 'pantry' | 'kitchen_cupboard' | 'other';
}

export type CustomStorageArea = StorageArea;

export interface CreateHouseholdRequest {
  name: string;
  description?: string;
  storageAreas?: StorageArea[];
}