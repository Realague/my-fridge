import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

// These are all the attributes in the HouseholdMember model
interface HouseholdMemberAttributes {
  id: string;
  householdId: string;
  userId: string;
  role: 'admin' | 'member';
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `HouseholdMember.build()` and `HouseholdMember.create()`
interface HouseholdMemberCreationAttributes extends Optional<HouseholdMemberAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> {}

export class HouseholdMember extends Model<HouseholdMemberAttributes, HouseholdMemberCreationAttributes> implements HouseholdMemberAttributes {
  public id!: string;
  public householdId!: string;
  public userId!: string;
  public role!: 'admin' | 'member';
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes for TypeScript
  public readonly household?: any;
  public readonly user?: any;
}

HouseholdMember.init(
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    role: {
      type: DataTypes.ENUM('admin', 'member'),
      allowNull: false,
      defaultValue: 'member',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'household_members',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['householdId', 'userId'],
      },
    ],
  }
); 