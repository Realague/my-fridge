import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { HouseholdActivityAction, HOUSEHOLD_ACTIVITY_ACTIONS, HouseholdActivityTargetType, HOUSEHOLD_ACTIVITY_TARGET_TYPES } from '../types/enums';
import { User } from './User';
import { Household } from './Household';

// Append-only activity log for the three "add" actions used by personalized
// item search. Never records stock exits — those live in `stock_exits`.
interface HouseholdActivityAttributes {
  id: string;
  householdId: string;
  userId: string;
  itemId: string | null;
  itemNameSnapshot: string | null;
  action: HouseholdActivityAction;
  targetType: HouseholdActivityTargetType | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface HouseholdActivityCreationAttributes
  extends Optional<
    HouseholdActivityAttributes,
    'id' | 'itemId' | 'itemNameSnapshot' | 'targetType' | 'targetId' | 'metadata' | 'createdAt' | 'updatedAt'
  > {}

export class HouseholdActivity
  extends Model<HouseholdActivityAttributes, HouseholdActivityCreationAttributes>
  implements HouseholdActivityAttributes
{
  public id!: string;
  public householdId!: string;
  public userId!: string;
  public itemId!: string | null;
  public itemNameSnapshot!: string | null;
  public action!: HouseholdActivityAction;
  public targetType!: HouseholdActivityTargetType | null;
  public targetId!: string | null;
  public metadata!: Record<string, unknown> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public readonly user?: User;
  public readonly household?: Household;
}

HouseholdActivity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'households', key: 'id' },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    itemId: {
      // Plain UUID, NO hard FK: the referenced Item may be hard-deleted.
      // A dangling itemId simply yields no join row and is skipped by scoring.
      type: DataTypes.UUID,
      allowNull: true,
    },
    itemNameSnapshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    action: {
      type: DataTypes.ENUM(...HOUSEHOLD_ACTIVITY_ACTIONS),
      allowNull: false,
    },
    targetType: {
      type: DataTypes.ENUM(...HOUSEHOLD_ACTIVITY_TARGET_TYPES),
      allowNull: true,
    },
    targetId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'household_activities',
    timestamps: true,
    indexes: [
      { fields: ['householdId', 'userId', 'createdAt'] },
      { fields: ['householdId', 'action', 'createdAt'] },
      { fields: ['householdId', 'createdAt'] },
    ],
  }
);
