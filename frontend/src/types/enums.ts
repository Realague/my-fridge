export enum StorageAreaType {
  FRIDGE = 'fridge',
  FREEZER = 'freezer',
  PANTRY = 'pantry',
  KITCHEN_CUPBOARD = 'kitchen_cupboard',
  OTHER = 'other'
}

export const STORAGE_AREA_TYPES = Object.values(StorageAreaType);

// Distinguishes how a stored item leaves the stock. Mirrors backend `StockExitType`.
export enum StockExitType {
  CONSUMED = 'consumed', // eaten / cooked / used — positive outcome (green)
  WASTED = 'wasted',     // thrown away — food waste (red)
  REMOVED = 'removed',   // left stock, neutral: given, transferred, mistake (grey)
}

export const STOCK_EXIT_TYPES = Object.values(StockExitType);

export enum ItemCategory {
  VEGETABLES = 'vegetables',
  FRUITS = 'fruits',
  MEAT = 'meat',
  FISH = 'fish',
  SEAFOOD = 'seafood',
  DAIRY = 'dairy',
  GRAINS = 'grains',
  SPICES = 'spices',
  BEVERAGES = 'beverages',
  SNACKS = 'snacks',
  CONDIMENTS = 'condiments',
  FROZEN = 'frozen',
  CANNED = 'canned',
  MEAL = 'meal',
  COOKED_MEAL = 'cooked_meal',
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
  TABLESPOON = 'tbsp',
  TEASPOON = 'tsp',

  // Pieces
  PIECE = 'piece',

  // Portion / cooked dish — only meaningful for catalog items in category `meal` or `cooked_meal`.
  SERVING = 'serving',

  // Free-quantity (gestural) units — recipe-only, no numeric quantity
  PINCH = 'pinch',
  DRIZZLE = 'drizzle',
  KNOB = 'knob',
}

export const UNITS = Object.values(Unit);

export const FREE_QUANTITY_UNITS: Unit[] = [
  Unit.PINCH,
  Unit.DRIZZLE,
  Unit.KNOB,
];

// `serving` is not hidden globally — it is only offered for `ItemCategory.MEAL` (see unitSystem).
export const HIDDEN_STORAGE_UNITS: Unit[] = [];

// Shopping-list article states. Mirrors backend `ShoppingItemStatus`.
//  - TO_BUY:   in the list, not yet in the cart ("À acheter")
//  - TO_STORE: bought, waiting to be stored ("À ranger")
// "Rangé" is not persisted: storing an item deletes the ShoppingItem row.
export enum ShoppingItemStatus {
  TO_BUY = 'to_buy',
  TO_STORE = 'to_store',
}

export const SHOPPING_ITEM_STATUSES = Object.values(ShoppingItemStatus);

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

export enum BrandCategory {
  GRANDE_DISTRIBUTION = 'grande_distribution',
  HARD_DISCOUNT = 'hard_discount',
  BIO_ALIMENTAIRE = 'bio_alimentaire',
  SURGELE = 'surgele',
  BEAUTE = 'beaute',
  BRICOLAGE_MAISON = 'bricolage_maison',
  SPORT_CULTURE_TECH = 'sport_culture_tech',
  MODE = 'mode'
}

export const BRAND_CATEGORIES = Object.values(BrandCategory);