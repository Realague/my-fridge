import sequelize from '../config/database';
import { User } from './User';
import { Household } from './Household';
import { HouseholdMember } from './HouseholdMember';
import { StorageArea } from './StorageArea';
import { Item } from './Item';
import { ShoppingItem } from './ShoppingItem';
import { StoredItem } from './StoredItem';
import { Recipe } from './Recipe';
import { RecipeIngredient } from './RecipeIngredient';
import { Meal } from './Meal';
import { ItemMinimum } from './ItemMinimum';
import { LoyaltyCard } from './LoyaltyCard';
import { HouseholdSettings } from './HouseholdSettings';
import { ExpirationNotification } from './ExpirationNotification';
import { ExpirationNotificationRead } from './ExpirationNotificationRead';
import { PushSubscription } from './PushSubscription';
import { Brand } from './Brand';
import { StockExit } from './StockExit';
import { BarcodeMapping } from './BarcodeMapping';
import { HouseholdActivity } from './HouseholdActivity';
import { CatalogRecipe } from './CatalogRecipe';
import { CatalogRecipeIngredient } from './CatalogRecipeIngredient';

// Define associations
User.hasMany(Household, { foreignKey: 'createdBy', as: 'createdHouseholds' });
Household.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Many-to-many relationship between User and Household through HouseholdMember
User.belongsToMany(Household, {
  through: HouseholdMember,
  foreignKey: 'userId',
  otherKey: 'householdId',
  as: 'households',
});

Household.belongsToMany(User, {
  through: HouseholdMember,
  foreignKey: 'householdId',
  otherKey: 'userId',
  as: 'members',
});

// Direct associations with HouseholdMember
User.hasMany(HouseholdMember, { foreignKey: 'userId', as: 'householdMemberships' });
HouseholdMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Household.hasMany(HouseholdMember, { foreignKey: 'householdId', as: 'memberships' });
HouseholdMember.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

// Storage Area associations
Household.hasMany(StorageArea, { foreignKey: 'householdId', as: 'storageAreas' });
StorageArea.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

// Item associations
User.hasMany(Item, { foreignKey: 'createdBy', as: 'createdItems' });
Item.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Household.hasMany(Item, { foreignKey: 'householdId', as: 'items' });
Item.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

// Shopping Item associations
Item.hasMany(ShoppingItem, { foreignKey: 'itemId', as: 'shoppingItems' });
ShoppingItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

Household.hasMany(ShoppingItem, { foreignKey: 'householdId', as: 'shoppingItems' });
ShoppingItem.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

User.hasMany(ShoppingItem, { foreignKey: 'createdBy', as: 'createdShoppingItems' });
ShoppingItem.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Stored Item associations
Item.hasMany(StoredItem, { foreignKey: 'itemId', as: 'storedItems' });
StoredItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

StorageArea.hasMany(StoredItem, { foreignKey: 'storageAreaId', as: 'storedItems' });
StoredItem.belongsTo(StorageArea, { foreignKey: 'storageAreaId', as: 'storageArea' });

Household.hasMany(StoredItem, { foreignKey: 'householdId', as: 'storedItems' });
StoredItem.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

User.hasMany(StoredItem, { foreignKey: 'createdBy', as: 'createdStoredItems' });
StoredItem.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Recipe associations
User.hasMany(Recipe, { foreignKey: 'createdBy', as: 'createdRecipes' });
Recipe.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Household.hasMany(Recipe, { foreignKey: 'householdId', as: 'recipes' });
Recipe.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

// Recipe Ingredient associations
Recipe.hasMany(RecipeIngredient, { foreignKey: 'recipeId', as: 'ingredients' });
RecipeIngredient.belongsTo(Recipe, { foreignKey: 'recipeId', as: 'recipe' });

// Recipe ↔ cooked-meal Item association (1:1 logical, optional).
// FK is on Item (recipeId). On Recipe delete, the FK is set to NULL by the
// migration; the service layer is responsible for the full cascade (delete
// the linked Item and all its StoredItems before deleting the Recipe).
Recipe.hasOne(Item, { foreignKey: 'recipeId', as: 'cookedMealItem' });
Item.belongsTo(Recipe, { foreignKey: 'recipeId', as: 'recipe' });

Item.hasMany(RecipeIngredient, { foreignKey: 'itemId', as: 'recipeIngredients' });
RecipeIngredient.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

// Meal associations
Household.hasMany(Meal, { foreignKey: 'householdId', as: 'meals' });
Meal.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

Recipe.hasMany(Meal, { foreignKey: 'recipeId', as: 'meals' });
Meal.belongsTo(Recipe, { foreignKey: 'recipeId', as: 'recipe' });

// Item Minimum associations
Item.hasMany(ItemMinimum, { foreignKey: 'itemId', as: 'itemMinimums' });
ItemMinimum.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

Household.hasMany(ItemMinimum, { foreignKey: 'householdId', as: 'itemMinimums' });
ItemMinimum.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

User.hasMany(ItemMinimum, { foreignKey: 'createdBy', as: 'createdItemMinimums' });
ItemMinimum.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Loyalty Card associations
Household.hasMany(LoyaltyCard, { foreignKey: 'householdId', as: 'loyaltyCards' });
LoyaltyCard.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

User.hasMany(LoyaltyCard, { foreignKey: 'createdBy', as: 'createdLoyaltyCards' });
LoyaltyCard.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Household Settings associations (one-to-one)
Household.hasOne(HouseholdSettings, { foreignKey: 'householdId', as: 'settings', onDelete: 'CASCADE' });
HouseholdSettings.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

// Expiration Notification associations
Household.hasMany(ExpirationNotification, { foreignKey: 'householdId', as: 'expirationNotifications', onDelete: 'CASCADE' });
ExpirationNotification.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

StoredItem.hasMany(ExpirationNotification, { foreignKey: 'storedItemId', as: 'expirationNotifications', onDelete: 'CASCADE' });
ExpirationNotification.belongsTo(StoredItem, { foreignKey: 'storedItemId', as: 'storedItem' });

ExpirationNotification.hasMany(ExpirationNotificationRead, { foreignKey: 'notificationId', as: 'reads', onDelete: 'CASCADE' });
ExpirationNotificationRead.belongsTo(ExpirationNotification, { foreignKey: 'notificationId', as: 'notification' });

User.hasMany(ExpirationNotificationRead, { foreignKey: 'userId', as: 'expirationNotificationReads', onDelete: 'CASCADE' });
ExpirationNotificationRead.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Push Subscription associations
User.hasMany(PushSubscription, { foreignKey: 'userId', as: 'pushSubscriptions', onDelete: 'CASCADE' });
PushSubscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Stock Exit associations
// itemId is intentionally a plain UUID (no FK) — the referenced item may be
// hard-deleted; the log keeps a snapshot instead. storedItemId, however, has a
// real FK (SET NULL on delete): stored_items is now soft-delete so the row
// survives a "removal" and the link stays valid.
Household.hasMany(StockExit, { foreignKey: 'householdId', as: 'stockExits' });
StockExit.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

User.hasMany(StockExit, { foreignKey: 'exitedBy', as: 'stockExits' });
StockExit.belongsTo(User, { foreignKey: 'exitedBy', as: 'exitedByUser' });

StoredItem.hasMany(StockExit, { foreignKey: 'storedItemId', as: 'stockExits' });
StockExit.belongsTo(StoredItem, { foreignKey: 'storedItemId', as: 'storedItem' });

// Household Activity associations
// itemId is intentionally a plain UUID (no FK) — the referenced item may be
// hard-deleted; the log keeps a name snapshot instead.
Household.hasMany(HouseholdActivity, { foreignKey: 'householdId', as: 'activities' });
HouseholdActivity.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

User.hasMany(HouseholdActivity, { foreignKey: 'userId', as: 'activities' });
HouseholdActivity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Brand is a global referential — no associations

// Barcode Mapping associations. The mapping is a global (cross-household)
// referential keyed on barcode; it only links to the catalog Item it resolves
// to (and, optionally, the user who first created it).
Item.hasMany(BarcodeMapping, { foreignKey: 'itemId', as: 'barcodeMappings' });
BarcodeMapping.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

User.hasMany(BarcodeMapping, { foreignKey: 'createdBy', as: 'createdBarcodeMappings' });
BarcodeMapping.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Catalog Recipe associations.
// La recette catalogue est une COPIE FIGÉE et INDÉPENDANTE de la recette perso :
// tous les liens vers l'origine (auteur, foyer, recette source) sont en SET NULL,
// jamais en CASCADE. Supprimer la recette perso ou le compte de l'auteur ne doit
// pas faire disparaître la publication.
CatalogRecipe.hasMany(CatalogRecipeIngredient, {
  foreignKey: 'catalogRecipeId',
  as: 'ingredients',
  onDelete: 'CASCADE',
});
CatalogRecipeIngredient.belongsTo(CatalogRecipe, {
  foreignKey: 'catalogRecipeId',
  as: 'catalogRecipe',
});

Item.hasMany(CatalogRecipeIngredient, { foreignKey: 'itemId', as: 'catalogRecipeIngredients' });
CatalogRecipeIngredient.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

User.hasMany(CatalogRecipe, { foreignKey: 'authorUserId', as: 'publishedRecipes' });
CatalogRecipe.belongsTo(User, { foreignKey: 'authorUserId', as: 'author' });

Household.hasMany(CatalogRecipe, { foreignKey: 'authorHouseholdId', as: 'publishedRecipes' });
CatalogRecipe.belongsTo(Household, { foreignKey: 'authorHouseholdId', as: 'authorHousehold' });

// hasOne et non hasMany : un index unique partiel garantit une seule publication
// vivante (status <> 'removed') par recette perso.
Recipe.hasOne(CatalogRecipe, { foreignKey: 'sourceRecipeId', as: 'catalogPublication' });
CatalogRecipe.belongsTo(Recipe, { foreignKey: 'sourceRecipeId', as: 'sourceRecipe' });

// Export models
export {
  sequelize,
  User,
  Household,
  HouseholdMember,
  StorageArea,
  Item,
  ShoppingItem,
  StoredItem,
  Recipe,
  RecipeIngredient,
  Meal,
  ItemMinimum,
  LoyaltyCard,
  HouseholdSettings,
  ExpirationNotification,
  ExpirationNotificationRead,
  PushSubscription,
  Brand,
  StockExit,
  BarcodeMapping,
  HouseholdActivity,
  CatalogRecipe,
  CatalogRecipeIngredient
};