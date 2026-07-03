import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Item } from './Item';
import { Household } from './Household';
import { User } from './User';
import { Unit, LINE_STORAGE_UNITS, ShoppingItemStatus, SHOPPING_ITEM_STATUSES } from '../types/enums';

interface ShoppingItemAttributes {
  id: string;
  itemId: string;
  householdId: string;
  quantity: number;
  unit: string;
  status: ShoppingItemStatus;
  priority: number;
  storedItemId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ShoppingItemCreationAttributes extends Optional<ShoppingItemAttributes, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'priority' | 'storedItemId'> {}

class ShoppingItem extends Model<ShoppingItemAttributes, ShoppingItemCreationAttributes> implements ShoppingItemAttributes {
  public id!: string;
  public itemId!: string;
  public householdId!: string;
  public quantity!: number;
  public unit!: string;
  public status!: ShoppingItemStatus;
  public priority!: number;
  public storedItemId!: string | null;
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
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      get() {
        const value = this.getDataValue('quantity');
        return value ? Number(value) : 0;
      },
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isStorageUnit(value: string) {
          // Shopping items should only use storage-appropriate units, not cooking measurements
          if (!LINE_STORAGE_UNITS.includes(value as Unit)) {
            throw new Error(`Unit ${value} is not allowed for shopping items. Please use storage-appropriate units (ml, l, g, kg, etc.)`);
          }
        },
      },
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ShoppingItemStatus.TO_BUY,
      validate: {
        isValidStatus(value: string) {
          if (!SHOPPING_ITEM_STATUSES.includes(value as ShoppingItemStatus)) {
            throw new Error(`Invalid shopping item status: ${value}`);
          }
        },
      },
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    storedItemId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'stored_item_id',
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