import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Recipe } from './Recipe';
import { Household } from './Household';
import { User } from './User';

// These are all the attributes in the MealPlan model
interface MealPlanAttributes {
  id: string;
  householdId: string;
  recipeId: string;
  date: string; // YYYY-MM-DD format
  mealType: 'breakfast' | 'lunch' | 'dinner';
  servings: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `MealPlan.build` and `MealPlan.create` calls
interface MealPlanCreationAttributes extends Optional<MealPlanAttributes, 'id' | 'notes' | 'createdAt' | 'updatedAt'> {}

export class MealPlan extends Model<MealPlanAttributes, MealPlanCreationAttributes> implements MealPlanAttributes {
  public id!: string;
  public householdId!: string;
  public recipeId!: string;
  public date!: string;
  public mealType!: 'breakfast' | 'lunch' | 'dinner';
  public servings!: number;
  public notes?: string;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // associations
  public getRecipe!: () => Promise<Recipe>;
  public getHousehold!: () => Promise<Household>;
}

MealPlan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'households',
        key: 'id',
      },
    },
    recipeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'recipes',
        key: 'id',
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
      },
    },
    mealType: {
      type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'),
      allowNull: false,
    },
    servings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 20,
      },
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'meal_plans',
    timestamps: true,
    indexes: [
      {
        fields: ['householdId'],
      },
      {
        fields: ['recipeId'],
      },
      {
        fields: ['date'],
      },
      {
        fields: ['householdId', 'date'],
      },
      {
        fields: ['householdId', 'date', 'mealType'],
      },
    ],
  }
);

// Associations will be defined in models/index.ts

export { MealPlanAttributes, MealPlanCreationAttributes }; 