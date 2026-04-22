import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { ItemCategory, Unit, ITEM_CATEGORIES, UNITS, isCatalogStorageUnitForCategory } from '../types/enums';
import { User } from './User';
import { Household } from './Household';

// These are all the attributes in the Item model
interface ItemAttributes {
  id: string;
  name: string;
  category: ItemCategory;
  defaultUnit: Unit;
  availableUnits: Unit[];
  pieceAlias: string | null;
  daysAfterOpening: number | null;
  excludeFromShopping: boolean;
  imageUrl: string | null;
  householdId: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `Item.build()` and `Item.create()`
interface ItemCreationAttributes extends Optional<ItemAttributes, 'id' | 'defaultUnit' | 'availableUnits' | 'pieceAlias' | 'daysAfterOpening' | 'excludeFromShopping' | 'createdAt' | 'updatedAt'> {}

export class Item extends Model<ItemAttributes, ItemCreationAttributes> implements ItemAttributes {
  public id!: string;
  public name!: string;
  public category!: ItemCategory;
  public defaultUnit!: Unit;
  public availableUnits!: Unit[];
  public pieceAlias!: string | null;
  public daysAfterOpening!: number | null;
  public excludeFromShopping!: boolean;
  public imageUrl!: string | null;
  public createdBy!: string | null;
  public householdId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly creator?: User;
  public readonly household?: Household;
}

Item.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    category: {
      type: DataTypes.ENUM(...ITEM_CATEGORIES),
      allowNull: false,
      defaultValue: ItemCategory.OTHER,
    },
    defaultUnit: {
      type: DataTypes.ENUM(...UNITS),
      allowNull: false,
      defaultValue: Unit.PIECE,
      validate: {
        isValidForCategory(value: string) {
          const category = (this as Item).get('category') as ItemCategory;
          if (!isCatalogStorageUnitForCategory(value as Unit, category)) {
            throw new Error(`defaultUnit ${value} is not valid for category ${category}`);
          }
        },
      },
    },
    availableUnits: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [Unit.PIECE],
      validate: {
        isValidUnitsArray(value: any) {
          if (!Array.isArray(value)) {
            throw new Error('Available units must be an array');
          }
          if (value.length === 0) {
            throw new Error('Available units array cannot be empty');
          }
          const category = (this as Item).get('category') as ItemCategory;
          for (const unit of value) {
            if (!UNITS.includes(unit)) {
              throw new Error(`Invalid unit: ${unit}`);
            }
            // Cooking measurements (tbsp, tsp) and free-quantity units (pinch, drizzle, knob)
            // are recipe-only — they are not valid for storage catalog items.
            if (!isCatalogStorageUnitForCategory(unit as Unit, category)) {
              throw new Error(`Unit ${unit} is not available for this item category (catalog storage)`);
            }
          }
        },
      },
    },
    pieceAlias: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      validate: {
        len: [0, 50],
      },
    },
    daysAfterOpening: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    excludeFromShopping: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'households',
        key: 'id',
      },
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'items',
    timestamps: true,
    indexes: [
      {
        fields: ['category'],
      },
      {
        fields: ['name'],
      },
      {
        fields: ['createdBy'],
      },
      {
        fields: ['householdId'],
      },
      {
        fields: ['householdId', 'category'],
      },
    ],
  }
); 