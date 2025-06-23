import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Item } from './Item';
import { Household } from './Household';
import { User } from './User';

interface ShoppingItemAttributes {
  id: string;
  itemId: string;
  householdId: string;
  quantity: string;
  unit: string;
  completed: boolean;
  priority: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ShoppingItemCreationAttributes extends Optional<ShoppingItemAttributes, 'id' | 'createdAt' | 'updatedAt' | 'completed' | 'priority'> {}

class ShoppingItem extends Model<ShoppingItemAttributes, ShoppingItemCreationAttributes> implements ShoppingItemAttributes {
  public id!: string;
  public itemId!: string;
  public householdId!: string;
  public quantity!: string;
  public unit!: string;
  public completed!: boolean;
  public priority!: number;
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association helpers
  public readonly item?: Item;
  public readonly household?: Household;
  public readonly creator?: User;
}

ShoppingItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'item_id',
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'household_id',
    },
    quantity: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'shopping_items',
    timestamps: true,
    underscored: true,
  }
);

export { ShoppingItem }; 