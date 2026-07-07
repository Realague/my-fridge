import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';
import { Household } from './Household';
import { RecipeIngredient } from './RecipeIngredient';
import { RecipeStep } from '../types/RecipeDto';

export type RecipeDifficulty = 'Easy' | 'Medium' | 'Hard';

// These are all the attributes in the Recipe model
interface RecipeAttributes {
  id: string;
  title: string;
  description: string | null;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  instructions: RecipeStep[];
  tags: string[];
  imageUrl: string | null;
  sourceUrl: string | null;
  /** Bare host of `sourceUrl` (e.g. "marmiton.org"), for import traceability. */
  sourceDomain: string | null;
  /** When this recipe was ingested by the import pipeline. Null for hand-created recipes. */
  importedAt: Date | null;
  isFavorite: boolean;
  householdId: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `Recipe.build()` and `Recipe.create()`
export interface RecipeCreationAttributes extends Optional<RecipeAttributes, 'id' | 'description' | 'imageUrl' | 'sourceUrl' | 'sourceDomain' | 'importedAt' | 'isFavorite' | 'createdAt' | 'updatedAt'> {}

export class Recipe extends Model<RecipeAttributes, RecipeCreationAttributes> implements RecipeAttributes {
  public id!: string;
  public title!: string;
  public description!: string | null;
  public prepTime!: number;
  public cookTime!: number;
  public servings!: number;
  public difficulty!: RecipeDifficulty;
  public instructions!: RecipeStep[];
  public tags!: string[];
  public isFavorite!: boolean;
  public imageUrl!: string | null;
  public sourceUrl!: string | null;
  public sourceDomain!: string | null;
  public importedAt!: Date | null;
  public householdId!: string;
  public readonly createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly household?: Household;
  public readonly creator?: User;
  public readonly ingredients?: RecipeIngredient[];

  // Helper method to get total time
  public getTotalTime(): number {
    return this.prepTime + this.cookTime;
  }

  // Helper method to check if recipe has a specific tag
  public hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  // Helper method to add a tag
  public addTag(tag: string): void {
    if (!this.hasTag(tag)) {
      this.tags.push(tag);
    }
  }

  // Helper method to remove a tag
  public removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag);
  }
}

Recipe.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000],
      },
    },
    prepTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    cookTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    servings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    difficulty: {
      type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
      allowNull: false,
      defaultValue: 'Easy',
    },
    instructions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sourceUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sourceDomain: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    importedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isFavorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'households',
        key: 'id',
      },
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'recipes',
    timestamps: true,
    indexes: [
      {
        fields: ['householdId'],
      },
      {
        fields: ['createdBy'],
      },
      {
        fields: ['difficulty'],
      },
      {
        fields: ['isFavorite'],
      },
      {
        fields: ['householdId', 'isFavorite'],
      },
      {
        fields: ['householdId', 'difficulty'],
      },
    ],
  }
); 