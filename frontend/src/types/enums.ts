export enum StorageAreaType {
  FRIDGE = 'fridge',
  FREEZER = 'freezer',
  PANTRY = 'pantry',
  KITCHEN_CUPBOARD = 'kitchen_cupboard',
  OTHER = 'other'
}

export const STORAGE_AREA_TYPES = Object.values(StorageAreaType);

export enum ItemCategory {
  VEGETABLES = 'vegetables',
  FRUITS = 'fruits',
  MEAT = 'meat',
  DAIRY = 'dairy',
  GRAINS = 'grains',
  SPICES = 'spices',
  BEVERAGES = 'beverages',
  SNACKS = 'snacks',
  CONDIMENTS = 'condiments',
  FROZEN = 'frozen',
  CANNED = 'canned',
  MEAL = 'meal',
  PREPARATION = 'preparation',
  CLEANING_PRODUCTS = 'cleaning_products',
  OTHER = 'other'
}

export const ITEM_CATEGORIES = Object.values(ItemCategory);

export enum Unit {
  // Weight
  GRAM = 'g',
  KILOGRAM = 'kg',
  
  // Volume
  MILLILITER = 'ml',
  CENTILITER = 'cl',
  LITER = 'l',
  CUP = 'cup',
  TABLESPOON = 'tbsp',
  TEASPOON = 'tsp',
  
  // Pieces
  PIECE = 'piece',
  PACK = 'pack',
  BUNCH = 'bunch',
  DOZEN = 'dozen',

  // Meal
  SERVING = 'serving',
  
  // Other
  OTHER = 'other'
}

export const UNITS = Object.values(Unit);

export enum ShoppingItemStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum BarcodeFormat {
  EAN13 = 'ean13',
  EAN8 = 'ean8',
  CODE128 = 'code128',
  CODE39 = 'code39',
  QR = 'qr',
  DATA_MATRIX = 'data_matrix',
  PDF417 = 'pdf417',
  AZTEC = 'aztec',
  OTHER = 'other'
}

export const BARCODE_FORMATS = Object.values(BarcodeFormat); 