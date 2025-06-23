import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

// These are all the attributes in the Household model
interface HouseholdAttributes {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `Household.build()` and `Household.create()`
interface HouseholdCreationAttributes extends Optional<HouseholdAttributes, 'id' | 'description' | 'inviteCode' | 'createdAt' | 'updatedAt'> {}

export class Household extends Model<HouseholdAttributes, HouseholdCreationAttributes> implements HouseholdAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public inviteCode!: string;
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly members?: any[];
  public readonly creator?: any;

  // Helper method to generate a unique invite code
  static generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

Household.init(
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    inviteCode: {
      type: DataTypes.STRING(8),
      allowNull: false,
      unique: true,
      defaultValue: () => Household.generateInviteCode(),
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
    tableName: 'households',
    timestamps: true,
  }
); 