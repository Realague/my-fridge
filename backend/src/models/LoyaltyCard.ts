import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { BarcodeFormat, BARCODE_FORMATS } from '../types/enums';
import { Household } from './Household';
import { User } from './User';

interface LoyaltyCardAttributes {
  id: string;
  householdId: string;
  storeSlug: string | null;
  storeName: string;
  cardNumber: string;
  barcodeData: string | null;
  barcodeFormat: BarcodeFormat | null;
  notes: string | null;
  color: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface LoyaltyCardCreationAttributes extends Optional<LoyaltyCardAttributes, 'id' | 'storeSlug' | 'barcodeData' | 'barcodeFormat' | 'notes' | 'color' | 'createdAt' | 'updatedAt'> {}

export class LoyaltyCard extends Model<LoyaltyCardAttributes, LoyaltyCardCreationAttributes> implements LoyaltyCardAttributes {
  public id!: string;
  public householdId!: string;
  public storeSlug!: string | null;
  public storeName!: string;
  public cardNumber!: string;
  public barcodeData!: string | null;
  public barcodeFormat!: BarcodeFormat | null;
  public notes!: string | null;
  public color!: string | null;
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public readonly household?: Household;
  public readonly creator?: User;
}

LoyaltyCard.init(
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
    storeSlug: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    storeName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cardNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    barcodeData: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    barcodeFormat: {
      type: DataTypes.ENUM(...BARCODE_FORMATS),
      allowNull: true,
      defaultValue: null,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
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
    tableName: 'loyalty_cards',
    timestamps: true,
    indexes: [
      {
        fields: ['householdId'],
      },
      {
        fields: ['createdBy'],
      },
      {
        fields: ['householdId', 'storeSlug'],
      },
    ],
  }
);
