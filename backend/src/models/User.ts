import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

// These are all the attributes in the User model
interface UserAttributes {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  lowStockAlertsEnabled: boolean;
  googleId?: string;
  selectedHouseholdId?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `User.build()` and `User.create()`
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'lowStockAlertsEnabled' > {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public firstName!: string;
  public lastName!: string;
  public lowStockAlertsEnabled!: boolean;
  public googleId?: string;
  public selectedHouseholdId?: string;
  public refreshToken?: string;
  public refreshTokenExpiresAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Helper method to check if refresh token is valid
  public isRefreshTokenValid(): boolean {
    if (!this.refreshToken || !this.refreshTokenExpiresAt) return false;
    return new Date() < this.refreshTokenExpiresAt;
  }

  // Association attributes for TypeScript
  public readonly households?: any[];
  public readonly HouseholdMember?: any;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lowStockAlertsEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    selectedHouseholdId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'households',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique: true,
    },
    refreshTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
  }
); 