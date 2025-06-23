import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Unit, UNITS } from '../types/enums';
import { User } from './User';
import { Household } from './Household';
import { Item } from './Item';
import { StorageArea } from './StorageArea';

// These are all the attributes in the StoredItem model
interface StoredItemAttributes {
  id: string;
  itemId: string;
  storageAreaId: string;
  quantity: number;
  unit: Unit;
  expirationDate: Date | null;
  location: string | null;
  householdId: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `StoredItem.build()` and `StoredItem.create()`
interface StoredItemCreationAttributes extends Optional<StoredItemAttributes, 'id' | 'quantity' | 'unit' | 'expirationDate' | 'location' | 'createdAt' | 'updatedAt'> {}

export class StoredItem extends Model<StoredItemAttributes, StoredItemCreationAttributes> implements StoredItemAttributes {
  public id!: string;
  public itemId!: string;
  public storageAreaId!: string;
  public quantity!: number;
  public unit!: Unit;
  public expirationDate!: Date | null;
  public location!: string | null;
  public householdId!: string;
  public readonly createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly storageArea?: StorageArea;
  public readonly item?: Item;
  public readonly creator?: User;

  // Helper method to check if item is expired
  public isExpired(): boolean {
    if (!this.expirationDate) return false;
    return new Date() > this.expirationDate;
  }

  // Helper method to check if item is expiring soon (within 3 days)
  public isExpiringSoon(): boolean {
    if (!this.expirationDate) return false;
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return this.expirationDate <= threeDaysFromNow && !this.isExpired();
  }

  // Helper method to get days until expiration
  public getDaysUntilExpiration(): number | null {
    if (!this.expirationDate) return null;
    const today = new Date();
    const expiration = new Date(this.expirationDate);
    const diffTime = expiration.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

StoredItem.init(
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
    storageAreaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'storage_areas',
        key: 'id',
      },
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      defaultValue: 1.0,
      validate: {
        min: 0.001,
      },
    },
    unit: {
      type: DataTypes.ENUM(...UNITS),
      allowNull: false,
      defaultValue: Unit.PIECE,
    },
    expirationDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500],
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
    tableName: 'stored_items',
    timestamps: true,
    indexes: [
      {
        fields: ['itemId'],
      },
      {
        fields: ['storageAreaId'],
      },
      {
        fields: ['householdId'],
      },
      {
        fields: ['createdBy'],
      },
      {
        fields: ['expirationDate'],
      },
      {
        fields: ['householdId', 'storageAreaId'],
      },
      {
        fields: ['householdId', 'itemId'],
      },
      {
        fields: ['storageAreaId', 'itemId'],
      },
    ],
  }
); 