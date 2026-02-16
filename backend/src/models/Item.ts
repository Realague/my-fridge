import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { ItemCategory, Unit, ITEM_CATEGORIES, UNITS, STORAGE_UNITS } from '../types/enums';
import { User } from './User';
import { Household } from './Household';

// These are all the attributes in the Item model
interface ItemAttributes {
  id: string;
  name: string;
  category: ItemCategory;
  defaultUnit: Unit;
  availableUnits: Unit[];
  daysAfterOpening: number | null;
  imageUrl: string | null;
  householdId: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `Item.build()` and `Item.create()`
interface ItemCreationAttributes extends Optional<ItemAttributes, 'id' | 'defaultUnit' | 'availableUnits' | 'daysAfterOpening' | 'createdAt' | 'updatedAt'> {}

export class Item extends Model<ItemAttributes, ItemCreationAttributes> implements ItemAttributes {
  public id!: string;
  public name!: string;
  public category!: ItemCategory;
  public defaultUnit!: Unit;
  public availableUnits!: Unit[];
  public daysAfterOpening!: number | null;
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
          for (const unit of value) {
            if (!UNITS.includes(unit)) {
              throw new Error(`Invalid unit: ${unit}`);
            }
            // Cooking measurements (cup, tbsp, tsp) are only allowed in recipes, not in item definitions
            if (!STORAGE_UNITS.includes(unit)) {
              throw new Error(`Unit ${unit} is only available for recipes, not for storage items`);
            }
          }
        },
      },
    },
    daysAfterOpening: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
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