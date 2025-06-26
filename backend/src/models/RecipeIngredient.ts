import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Unit, UNITS } from '../types/enums';
import { Recipe } from './Recipe';
import { Item } from './Item';

// These are all the attributes in the RecipeIngredient model
interface RecipeIngredientAttributes {
  id: string;
  recipeId: string;
  itemId: string;
  quantity: number;
  unit: Unit;
  notes: string | null;
  usedInSteps: number[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `RecipeIngredient.build()` and `RecipeIngredient.create()`
interface RecipeIngredientCreationAttributes extends Optional<RecipeIngredientAttributes, 'id' | 'notes' | 'usedInSteps' | 'createdAt' | 'updatedAt'> {}

export class RecipeIngredient extends Model<RecipeIngredientAttributes, RecipeIngredientCreationAttributes> implements RecipeIngredientAttributes {
  public id!: string;
  public recipeId!: string;
  public itemId!: string;
  public quantity!: number;
  public unit!: Unit;
  public notes!: string | null;
  public usedInSteps!: number[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly recipe?: Recipe;
  public readonly item?: Item;

  // Helper method to check if ingredient is used in a specific step
  public isUsedInStep(stepIndex: number): boolean {
    return this.usedInSteps.includes(stepIndex);
  }

  // Helper method to add a step
  public addToStep(stepIndex: number): void {
    if (!this.isUsedInStep(stepIndex)) {
      this.usedInSteps.push(stepIndex);
      this.usedInSteps.sort((a, b) => a - b);
    }
  }

  // Helper method to remove from a step
  public removeFromStep(stepIndex: number): void {
    this.usedInSteps = this.usedInSteps.filter(step => step !== stepIndex);
  }
}

RecipeIngredient.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    recipeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'recipes',
        key: 'id',
      },
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'items',
        key: 'id',
      },
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    unit: {
      type: DataTypes.ENUM(...UNITS),
      allowNull: false,
      defaultValue: Unit.PIECE,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    usedInSteps: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
  },
  {
    sequelize,
    tableName: 'recipe_ingredients',
    timestamps: true,
    indexes: [
      {
        fields: ['recipeId'],
      },
      {
        fields: ['itemId'],
      },
      {
        fields: ['recipeId', 'itemId'],
        unique: true,
        name: 'recipe_ingredients_recipe_item_unique',
      },
    ],
  }
); 