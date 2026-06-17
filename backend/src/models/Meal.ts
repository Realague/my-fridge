import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Recipe } from './Recipe';
import { Household } from './Household';

interface MealAttributes {
  id: string;
  householdId: string;
  recipeId: string;
  servings: number;
  position: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MealCreationAttributes
  extends Optional<MealAttributes, 'id' | 'position' | 'createdAt' | 'updatedAt'> {}

export class Meal extends Model<MealAttributes, MealCreationAttributes> implements MealAttributes {
  public id!: string;
  public householdId!: string;
  public recipeId!: string;
  public servings!: number;
  public position!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public getRecipe!: () => Promise<Recipe>;
  public getHousehold!: () => Promise<Household>;
}

Meal.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'households', key: 'id' },
    },
    recipeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'recipes', key: 'id' },
    },
    servings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 20 },
      defaultValue: 1,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'meals',
    timestamps: true,
    indexes: [
      { fields: ['householdId'] },
      { fields: ['recipeId'] },
      { fields: ['householdId', 'position'] },
    ],
  }
);

export { MealAttributes, MealCreationAttributes };
