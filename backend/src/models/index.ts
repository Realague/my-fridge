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
import { MealPlan } from './MealPlan';

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

// Meal Plan associations
Household.hasMany(MealPlan, { foreignKey: 'householdId', as: 'mealPlans' });
MealPlan.belongsTo(Household, { foreignKey: 'householdId', as: 'household' });

Recipe.hasMany(MealPlan, { foreignKey: 'recipeId', as: 'mealPlans' });
MealPlan.belongsTo(Recipe, { foreignKey: 'recipeId', as: 'recipe' });

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
  MealPlan
}; 