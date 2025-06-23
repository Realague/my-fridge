import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

// These are all the attributes in the User model
interface UserAttributes {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  googleId?: string;
  selectedHouseholdId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `User.build()` and `User.create()`
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt' > {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public firstName!: string;
  public lastName!: string;
  public googleId?: string;
  public selectedHouseholdId?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

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
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
  }
); 