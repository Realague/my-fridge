import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

interface HouseholdSettingsAttributes {
  id: string;
  householdId: string;
  expirationAlertDays: number;
  exitSuggestionsEnabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface HouseholdSettingsCreationAttributes
  extends Optional<
    HouseholdSettingsAttributes,
    'id' | 'expirationAlertDays' | 'exitSuggestionsEnabled' | 'createdAt' | 'updatedAt'
  > {}

export class HouseholdSettings
  extends Model<HouseholdSettingsAttributes, HouseholdSettingsCreationAttributes>
  implements HouseholdSettingsAttributes
{
  public id!: string;
  public householdId!: string;
  public expirationAlertDays!: number;
  public exitSuggestionsEnabled!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

HouseholdSettings.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'households',
        key: 'id',
      },
    },
    expirationAlertDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 1,
        max: 14,
      },
    },
    exitSuggestionsEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'household_settings',
    timestamps: true,
    indexes: [
      {
        fields: ['householdId'],
      },
    ],
  }
);
