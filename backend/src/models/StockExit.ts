import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Unit, UNITS, StockExitType, STOCK_EXIT_TYPES } from '../types/enums';
import { User } from './User';
import { Household } from './Household';
import { StoredItem } from './StoredItem';

// These are all the attributes in the StockExit model
interface StockExitAttributes {
  id: string;
  householdId: string;
  storedItemId: string | null;
  itemId: string | null;
  exitType: StockExitType;
  quantity: number;
  unit: Unit;
  exitedBy: string;
  itemNameSnapshot: string | null;
  categorySnapshot: string | null;
  storageAreaIdSnapshot: string | null;
  storageAreaNameSnapshot: string | null;
  expirationDateSnapshot: Date | null;
  restoreSnapshot: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StockExitCreationAttributes
  extends Optional<
    StockExitAttributes,
    | 'id'
    | 'storedItemId'
    | 'itemId'
    | 'itemNameSnapshot'
    | 'categorySnapshot'
    | 'storageAreaIdSnapshot'
    | 'storageAreaNameSnapshot'
    | 'expirationDateSnapshot'
    | 'restoreSnapshot'
    | 'createdAt'
    | 'updatedAt'
  > {}

export class StockExit
  extends Model<StockExitAttributes, StockExitCreationAttributes>
  implements StockExitAttributes
{
  public id!: string;
  public householdId!: string;
  public storedItemId!: string | null;
  public itemId!: string | null;
  public exitType!: StockExitType;
  public quantity!: number;
  public unit!: Unit;
  public exitedBy!: string;
  public itemNameSnapshot!: string | null;
  public categorySnapshot!: string | null;
  public storageAreaIdSnapshot!: string | null;
  public storageAreaNameSnapshot!: string | null;
  public expirationDateSnapshot!: Date | null;
  public restoreSnapshot!: Record<string, unknown> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly exitedByUser?: User;
  public readonly household?: Household;
  public readonly storedItem?: StoredItem;
}

StockExit.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'households',
        key: 'id',
      },
    },
    storedItemId: {
      // Real FK to stored_items(id), SET NULL on delete (see migration
      // 202607014). stored_items is soft-delete, so the row survives a
      // "removal" and the link stays valid; only a hard-delete nulls it.
      type: DataTypes.UUID,
      allowNull: true,
    },
    itemId: {
      // Plain UUID, NO hard FK: the referenced Item may be hard-deleted.
      type: DataTypes.UUID,
      allowNull: true,
    },
    exitType: {
      type: DataTypes.ENUM(...STOCK_EXIT_TYPES),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      validate: {
        min: 0.001,
      },
    },
    unit: {
      type: DataTypes.ENUM(...UNITS),
      allowNull: false,
    },
    exitedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    itemNameSnapshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categorySnapshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    storageAreaIdSnapshot: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    storageAreaNameSnapshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expirationDateSnapshot: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    restoreSnapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'stock_exits',
    timestamps: true,
    indexes: [
      { fields: ['householdId'] },
      { fields: ['exitedBy'] },
      { fields: ['householdId', 'createdAt'] },
    ],
  }
);
