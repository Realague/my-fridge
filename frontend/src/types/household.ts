export interface StorageAreaSelections {
  hasFridge?: boolean;
  hasFreezer?: boolean;
  hasPantry?: boolean;
  hasKitchenCupboard?: boolean;
}

export interface CustomStorageArea {
  name: string;
  description?: string;
  emoji: string;
  type: 'fridge' | 'freezer' | 'pantry' | 'kitchen_cupboard' | 'other';
}

export interface CreateHouseholdRequest {
  name: string;
  description?: string;
  storageAreas?: StorageAreaSelections;
  customStorageAreas?: CustomStorageArea[];
}

export interface StorageAreaOption {
  id: keyof StorageAreaSelections;
  name: string;
  emoji: string;
  description: string;
} 