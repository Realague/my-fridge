import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Unit, UNITS, FREE_QUANTITY_UNITS } from '../types/enums';
import { Item } from './Item';
import { CatalogRecipe } from './CatalogRecipe';

interface CatalogRecipeIngredientAttributes {
  id: string;
  catalogRecipeId: string;
  /**
   * Article du catalogue global. Null quand l'ingrédient n'a pas pu être mappé
   * (agrégation externe) ou quand l'article d'origine était privé au foyer
   * auteur — dans les deux cas `rawText` porte l'information.
   */
  itemId: string | null;
  /** Texte source de l'ingrédient, ou snapshot du nom de l'article démappé. */
  rawText: string | null;
  /** Null quand `isFreeQuantity` est vrai (ingrédient "à l'œil"). */
  quantity: number | null;
  unit: Unit;
  isFreeQuantity: boolean;
  notes: string | null;
  usedInSteps: number[];
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CatalogRecipeIngredientCreationAttributes
  extends Optional<
    CatalogRecipeIngredientAttributes,
    | 'id'
    | 'itemId'
    | 'rawText'
    | 'quantity'
    | 'unit'
    | 'isFreeQuantity'
    | 'notes'
    | 'usedInSteps'
    | 'displayOrder'
    | 'createdAt'
    | 'updatedAt'
  > {}

export class CatalogRecipeIngredient
  extends Model<CatalogRecipeIngredientAttributes, CatalogRecipeIngredientCreationAttributes>
  implements CatalogRecipeIngredientAttributes
{
  public id!: string;
  public catalogRecipeId!: string;
  public itemId!: string | null;
  public rawText!: string | null;
  public quantity!: number | null;
  public unit!: Unit;
  public isFreeQuantity!: boolean;
  public notes!: string | null;
  public usedInSteps!: number[];
  public displayOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly catalogRecipe?: CatalogRecipe;
  public readonly item?: Item;
}

CatalogRecipeIngredient.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    catalogRecipeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'catalog_recipes', key: 'id' },
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'items', key: 'id' },
    },
    rawText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      validate: {
        quantityRequiredUnlessFree(this: CatalogRecipeIngredient, value: number | null) {
          if (this.isFreeQuantity) return;
          if (value === null || value === undefined) {
            throw new Error('quantity is required unless isFreeQuantity is true');
          }
          if (Number(value) <= 0) {
            throw new Error('quantity must be positive');
          }
        },
      },
    },
    unit: {
      type: DataTypes.ENUM(...UNITS),
      allowNull: false,
      defaultValue: Unit.PIECE,
    },
    isFreeQuantity: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        freeQuantityConsistency(this: CatalogRecipeIngredient, value: boolean) {
          // Gestural units (pinch/drizzle/knob) are always free-quantity.
          if (!value && FREE_QUANTITY_UNITS.includes(this.unit)) {
            throw new Error(`Unit ${this.unit} requires isFreeQuantity to be true`);
          }
        },
      },
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
      allowNull: false,
      defaultValue: [],
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'catalog_recipe_ingredients',
    timestamps: true,
    validate: {
      // Un ingrédient non mappé reste affichable grâce à rawText ; un ingrédient
      // sans ni l'un ni l'autre ne porte plus aucune information.
      itemIdOrRawTextRequired(this: CatalogRecipeIngredient) {
        if (!this.itemId && !this.rawText) {
          throw new Error('catalog ingredient requires either itemId or rawText');
        }
      },
    },
    // Pas de contrainte unique (catalogRecipeId, itemId) — contrairement à
    // recipe_ingredients — car itemId peut être NULL sur plusieurs lignes d'une
    // même recette agrégée.
    indexes: [
      { fields: ['catalogRecipeId', 'displayOrder'] },
      { fields: ['itemId'] },
    ],
  }
);
