export interface StorageAreaSelections {
  hasFridge?: boolean;
  hasFreezer?: boolean;
  hasPantry?: boolean;
  hasKitchenCupboard?: boolean;
}

export interface CreateHouseholdRequest {
  name: string;
  description?: string;
  storageAreas?: StorageAreaSelections;
}

export interface StorageAreaOption {
  id: keyof StorageAreaSelections;
  name: string;
  emoji: string;
  description: string;
} 