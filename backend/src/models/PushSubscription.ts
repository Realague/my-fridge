import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PushSubscriptionAttributes {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  lastSeenAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PushSubscriptionCreationAttributes
  extends Optional<
    PushSubscriptionAttributes,
    'id' | 'userAgent' | 'lastSeenAt' | 'createdAt' | 'updatedAt'
  > {}

export class PushSubscription
  extends Model<PushSubscriptionAttributes, PushSubscriptionCreationAttributes>
  implements PushSubscriptionAttributes
{
  public id!: string;
  public userId!: string;
  public endpoint!: string;
  public p256dh!: string;
  public auth!: string;
  public userAgent!: string | null;
  public lastSeenAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PushSubscription.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    p256dh: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    auth: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'push_subscriptions',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
    ],
  }
);
