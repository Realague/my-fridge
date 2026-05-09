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
  ExpirationNotificationRead
};