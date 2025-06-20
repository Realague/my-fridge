export enum StorageAreaType {
  FRIDGE = 'fridge',
  FREEZER = 'freezer',
  PANTRY = 'pantry',
  KITCHEN_CUPBOARD = 'kitchen_cupboard',
  OTHER = 'other'
}

// Helper to get all enum values as an array
export const STORAGE_AREA_TYPES = Object.values(StorageAreaType); 