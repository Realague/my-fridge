import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { Unit, UNITS, STORAGE_UNITS } from '../types/enums';
import { User } from './User';
import { Item } from './Item';
import { StorageArea } from './StorageArea';
import { getRecommendedFreezerDays } from '../utils/freezerStorageRecommendations';

// These are all the attributes in the StoredItem model
interface StoredItemAttributes {
  id: string;
  itemId: string;
  storageAreaId: string;
  quantity: number;
  unit: Unit;
  expirationDate: Date | null;
  location: string | null;
  isOpened: boolean;
  openedDate: Date | null;
  frozenDate: Date | null;
  householdId: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `StoredItem.build()` and `StoredItem.create()`
interface StoredItemCreationAttributes extends Optional<StoredItemAttributes, 'id' | 'quantity' | 'unit' | 'expirationDate' | 'location' | 'isOpened' | 'openedDate' | 'frozenDate' | 'createdAt' | 'updatedAt'> {}

export class StoredItem extends Model<StoredItemAttributes, StoredItemCreationAttributes> implements StoredItemAttributes {
  public id!: string;
  public itemId!: string;
  public storageAreaId!: string;
  public quantity!: number;
  public unit!: Unit;
  public expirationDate!: Date | null;
  public location!: string | null;
  public isOpened!: boolean;
  public openedDate!: Date | null;
  public frozenDate!: Date | null;
  public householdId!: string;
  public readonly createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly storageArea?: StorageArea;
  public readonly item?: Item;
  public readonly creator?: User;

  // Helper method to get effective expiration date
  public getEffectiveExpirationDate(): Date | null {
    // If item is opened and has daysAfterOpening set
    if (this.isOpened && this.openedDate && this.item?.daysAfterOpening) {
      const openedDate = new Date(this.openedDate);
      const effectiveDate = new Date(openedDate);
      effectiveDate.setDate(effectiveDate.getDate() + this.item.daysAfterOpening);
      return effectiveDate;
    }
    
    // Otherwise, use the standard expiration date
    return this.expirationDate ? new Date(this.expirationDate) : null;
  }

  // Helper method to check if item is expired
  public isExpired(): boolean {
    const effectiveDate = this.getEffectiveExpirationDate();
    if (!effectiveDate) return false;
    return new Date() > effectiveDate;
  }

  // Helper method to check if item is expiring soon (within 3 days)
  public isExpiringSoon(): boolean {
    const effectiveDate = this.getEffectiveExpirationDate();
    if (!effectiveDate) return false;
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return effectiveDate <= threeDaysFromNow && !this.isExpired();
  }

  // Helper method to get days until expiration
  public getDaysUntilExpiration(): number | null {
    const effectiveDate = this.getEffectiveExpirationDate();
    if (!effectiveDate) return null;
    const today = new Date();
    const diffTime = effectiveDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Helper method to get days since frozen
  public getDaysFrozen(): number | null {
    if (!this.frozenDate) return null;
    const frozenDate = new Date(this.frozenDate);
    const today = new Date();
    const diffTime = today.getTime() - frozenDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Helper method to get recommended freezer storage days based on item category
  public getRecommendedFreezerStorageDays(): number | null {
    if (!this.item?.category) return null;
    return getRecommendedFreezerDays(this.item.category);
  }

  // Helper method to check if item has been frozen too long
  public isFrozenTooLong(): boolean {
    if (!this.frozenDate) return false;
    const recommendedDays = this.getRecommendedFreezerStorageDays();
    if (!recommendedDays) return false;
    const daysFrozen = this.getDaysFrozen();
    if (daysFrozen === null) return false;
    return daysFrozen > recommendedDays;
  }

  public getDaysRemainingInFreezer(): number | null {
    if (!this.frozenDate) return null;
    const recommendedDays = this.getRecommendedFreezerStorageDays();
    if (recommendedDays === null) return null;
    const daysFrozen = this.getDaysFrozen();
    if (daysFrozen === null) return null;
    return recommendedDays - daysFrozen;
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
      validate: {
        isStorageUnit(value: string) {
          // Cooking measurements (cup, tbsp, tsp) are only allowed in recipes, not in storage
          if (!STORAGE_UNITS.includes(value as Unit)) {
            throw new Error(`Unit ${value} is only available for recipes, not for storage items`);
          }
        },
      },
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
    isOpened: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    openedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    frozenDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
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