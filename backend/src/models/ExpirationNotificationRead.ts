import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ExpirationNotificationReadAttributes {
  notificationId: string;
  userId: string;
  readAt: Date;
}

interface ExpirationNotificationReadCreationAttributes
  extends Optional<ExpirationNotificationReadAttributes, 'readAt'> {}

export class ExpirationNotificationRead
  extends Model<ExpirationNotificationReadAttributes, ExpirationNotificationReadCreationAttributes>
  implements ExpirationNotificationReadAttributes
{
  public notificationId!: string;
  public userId!: string;
  public readAt!: Date;
}

ExpirationNotificationRead.init(
  {
    notificationId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'expiration_notifications',
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'expiration_notification_reads',
    timestamps: false,
    indexes: [{ fields: ['userId'] }, { fields: ['notificationId'] }],
  }
);
