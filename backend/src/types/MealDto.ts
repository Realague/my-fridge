export interface CreateMealDto {
  recipeId: string;
  servings?: number;
}

export interface UpdateMealDto {
  servings?: number;
}

export interface MealDto {
  id: string;
  householdId: string;
  recipeId: string;
  servings: number;
  position: number;
  cookedAt: string | null;
  createdAt: string;
  updatedAt: string;
  recipe?: {
    id: string;
    title: string;
    prepTime: number;
    cookTime: number;
    servings: number;
    tags: string[];
    imageUrl?: string;
  };
}

export interface ShoppingListItemDto {
  itemId: string;
  itemName: string;
  totalQuantity: number;
  unit: string;
  recipes: string[];
}

export interface ShoppingPreviewItemDto {
  itemId: string;
  itemName: string;
  itemCategory: string;
  itemHouseholdId: string | null;   // null = seeded item (eligible to i18n)
  itemImageUrl: string | null;      // url Cloudinary de l'image (ou null)
  needed: number;          // quantité totale demandée par les recettes
  inStock: number;         // quantité présente dans le stock
  toBuy: number;           // delta à acheter (max 0, needed - inStock)
  unit: string;
  recipes: string[];       // titres des recettes consolidées
  existingShoppingQty: number;  // quantité déjà présente dans la shopping list active (même unité)
  shoppingItemId?: string;      // id du ShoppingItem existant si présent
}

export interface ShoppingPreviewDto {
  toBuy: ShoppingPreviewItemDto[];           // par défaut cochés
  inStock: ShoppingPreviewItemDto[];         // déjà couverts par le frigo
  inShoppingList: ShoppingPreviewItemDto[];  // déjà couverts par la liste de courses
  basics: ShoppingPreviewItemDto[];          // sel/poivre/huile/etc., décochés par défaut
}

export interface CommitShoppingItemInputDto {
  itemId: string;
  quantity: number;
  unit: string;
  recipes: string[];
}

export interface CommitShoppingMergeDto {
  newItems: ShoppingListItemDto[];
  mergedItems: Array<ShoppingListItemDto & { previousQuantity: number }>;
  alreadyCoveredItems: ShoppingListItemDto[];
}

// ——— Meal removal impact ———

export interface MealRemovalShoppingItemDto {
  shoppingItemId: string;
  itemId: string;
  itemName: string;
  itemHouseholdId: string | null;
  itemImageUrl: string | null;
  unit: string;
  currentQuantity: number;     // qté actuelle dans la shopping list
  reductionQuantity: number;   // ce qu'on enlève si on applique
  remainingQuantity: number;   // ce qui reste après réduction
  otherRecipes?: string[];     // pour toReduce : autres recettes qui en ont besoin
  isCompleted?: boolean;       // pour alreadyPurchased
}

export interface MealRemovalNoImpactItemDto {
  itemId: string;
  itemName: string;
  itemHouseholdId: string | null;
  itemImageUrl: string | null;
  needed: number;
  unit: string;
}

export interface MealRemovalImpactDto {
  mealId: string;
  recipeTitle: string;
  toRemove: MealRemovalShoppingItemDto[];
  toReduce: MealRemovalShoppingItemDto[];
  alreadyPurchased: MealRemovalShoppingItemDto[];
  noImpact: MealRemovalNoImpactItemDto[];
}

export type MealRemovalActionType = 'remove' | 'reduce' | 'keep';

export interface MealRemovalActionDto {
  shoppingItemId: string;
  action: MealRemovalActionType;
  newQuantity?: number; // requis si action = 'reduce'
}

export interface ConfirmMealRemovalDto {
  actions: MealRemovalActionDto[];
}

export interface MealsAvailabilityItemDto {
  itemId: string;
  itemName: string;
  needed: number;
  inStock: number;
  missing: number;
  unit: string;
}

export interface MealsAvailabilityDto {
  totalIngredients: number;
  missingCount: number;
  inStockCount: number;
  onShoppingListCount: number;
  expiringSoon: Array<{ itemId: string; itemName: string }>;
  items: MealsAvailabilityItemDto[];
}

export type RecipeAvailabilityStatus = 'haveAll' | 'missing' | 'usesExpiring';

export interface RecipeAvailabilityDto {
  recipeId: string;
  status: RecipeAvailabilityStatus;
  missingCount: number;
  expiringIngredients: string[];
}
