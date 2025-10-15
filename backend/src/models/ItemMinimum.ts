import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Unit, UNITS } from '../types/enums';
import { Item } from './Item';
import { Household } from './Household';
import { User } from './User';

interface ItemMinimumAttributes {
  id: string;
  itemId: string;
  householdId: string;
  minimumQuantity: number;
  minimumUnit: Unit;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ItemMinimumCreationAttributes extends Optional<ItemMinimumAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ItemMinimum extends Model<ItemMinimumAttributes, ItemMinimumCreationAttributes> implements ItemMinimumAttributes {
  public id!: string;
  public itemId!: string;
  public householdId!: string;
  public minimumQuantity!: number;
  public minimumUnit!: Unit;
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly item?: Item;
  public readonly household?: Household;
  public readonly creator?: User;
}

ItemMinimum.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'items',
        key: 'id',
      },
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'households',
        key: 'id',
      },
    },
    minimumQuantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    minimumUnit: {
      type: DataTypes.ENUM(...UNITS),
      allowNull: false,
      defaultValue: Unit.PIECE,
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
    tableName: 'item_minimums',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['itemId', 'householdId'],
        name: 'unique_item_household_minimum',
      },
      {
        fields: ['itemId'],
      },
      {
        fields: ['householdId'],
      },
      {
        fields: ['createdBy'],
      },
    ],
  }
);
