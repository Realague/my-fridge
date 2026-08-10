import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';
import { Household } from './Household';
import { Recipe, RecipeDifficulty } from './Recipe';
import { RecipeStep } from '../types/RecipeDto';
import { CatalogRecipeIngredient } from './CatalogRecipeIngredient';

/** Distingue une contribution d'un foyer d'une recette importée d'une source externe. */
export enum CatalogOriginType {
  COMMUNITY = 'community',
  AGGREGATED = 'aggregated',
}

export const CATALOG_ORIGIN_TYPES = Object.values(CatalogOriginType);

/** Prépare la modération a posteriori. Pour l'instant tout est `published`. */
export enum CatalogRecipeStatus {
  PUBLISHED = 'published',
  UNDER_REVIEW = 'under_review',
  REMOVED = 'removed',
}

export const CATALOG_RECIPE_STATUSES = Object.values(CatalogRecipeStatus);

interface CatalogRecipeAttributes {
  id: string;
  title: string;
  description: string | null;
  instructions: RecipeStep[];
  tags: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: RecipeDifficulty;
  imageUrl: string | null;
  /** Auteur de la publication. Null pour les recettes agrégées, ou si le compte est supprimé. */
  authorUserId: string | null;
  /** Foyer d'origine. Null pour les recettes agrégées, ou si le foyer est supprimé. */
  authorHouseholdId: string | null;
  /**
   * Recette perso d'origine. Nullable et SET NULL à la suppression : la copie
   * catalogue est indépendante et survit à la disparition de son original.
   */
  sourceRecipeId: string | null;
  originType: CatalogOriginType;
  /** Traçabilité de l'agrégation (et des recettes perso elles-mêmes importées). */
  sourceUrl: string | null;
  sourceDomain: string | null;
  status: CatalogRecipeStatus;
  publishedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CatalogRecipeCreationAttributes
  extends Optional<
    CatalogRecipeAttributes,
    | 'id'
    | 'description'
    | 'instructions'
    | 'tags'
    | 'imageUrl'
    | 'authorUserId'
    | 'authorHouseholdId'
    | 'sourceRecipeId'
    | 'originType'
    | 'sourceUrl'
    | 'sourceDomain'
    | 'status'
    | 'publishedAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

export class CatalogRecipe
  extends Model<CatalogRecipeAttributes, CatalogRecipeCreationAttributes>
  implements CatalogRecipeAttributes
{
  public id!: string;
  public title!: string;
  public description!: string | null;
  public instructions!: RecipeStep[];
  public tags!: string[];
  public prepTime!: number;
  public cookTime!: number;
  public servings!: number;
  public difficulty!: RecipeDifficulty;
  public imageUrl!: string | null;
  public authorUserId!: string | null;
  public authorHouseholdId!: string | null;
  public sourceRecipeId!: string | null;
  public originType!: CatalogOriginType;
  public sourceUrl!: string | null;
  public sourceDomain!: string | null;
  public status!: CatalogRecipeStatus;
  public publishedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly author?: User;
  public readonly authorHousehold?: Household;
  public readonly sourceRecipe?: Recipe;
  public readonly ingredients?: CatalogRecipeIngredient[];
}

CatalogRecipe.init(
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
    prepTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    cookTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    servings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    difficulty: {
      type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
      allowNull: false,
      defaultValue: 'Easy',
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    authorUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    authorHouseholdId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'households', key: 'id' },
    },
    sourceRecipeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'recipes', key: 'id' },
    },
    originType: {
      type: DataTypes.ENUM(...CATALOG_ORIGIN_TYPES),
      allowNull: false,
      defaultValue: CatalogOriginType.COMMUNITY,
    },
    sourceUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sourceDomain: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...CATALOG_RECIPE_STATUSES),
      allowNull: false,
      defaultValue: CatalogRecipeStatus.PUBLISHED,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'catalog_recipes',
    timestamps: true,
    // L'index unique partiel sur `sourceRecipeId` (une seule publication vivante
    // par recette perso) n'est pas déclarable ici — Sequelize ne gère pas de
    // clause WHERE dans `indexes`. Il est créé par la migration.
    indexes: [
      { fields: ['status', 'publishedAt'] },
      { fields: ['authorHouseholdId'] },
      { fields: ['authorUserId'] },
      { fields: ['originType', 'status'] },
    ],
  }
);
