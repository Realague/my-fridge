import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';

export type ExpirationNotificationPhase = 'initial' | 'reminder' | 'exit_suggestion';

interface ExpirationNotificationAttributes {
  id: string;
  householdId: string;
  storedItemId: string;
  phase: ExpirationNotificationPhase;
  itemNameSnapshot: string;
  itemHouseholdIdSnapshot: string | null;
  storageAreaNameSnapshot: string | null;
  storageAreaIdSnapshot: string | null;
  expirationDateSnapshot: Date;
  isOpenedSnapshot: boolean;
  openedDateSnapshot: Date | null;
  quantitySnapshot: number | null;
  unitSnapshot: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ExpirationNotificationCreationAttributes
  extends Optional<
    ExpirationNotificationAttributes,
    | 'id'
    | 'itemHouseholdIdSnapshot'
    | 'storageAreaNameSnapshot'
    | 'storageAreaIdSnapshot'
    | 'isOpenedSnapshot'
    | 'openedDateSnapshot'
    | 'quantitySnapshot'
    | 'unitSnapshot'
    | 'createdAt'
    | 'updatedAt'
  > {}

export class ExpirationNotification
  extends Model<ExpirationNotificationAttributes, ExpirationNotificationCreationAttributes>
  implements ExpirationNotificationAttributes
{
  public id!: string;
  public householdId!: string;
  public storedItemId!: string;
  public phase!: ExpirationNotificationPhase;
  public itemNameSnapshot!: string;
  public itemHouseholdIdSnapshot!: string | null;
  public storageAreaNameSnapshot!: string | null;
  public storageAreaIdSnapshot!: string | null;
  public expirationDateSnapshot!: Date;
  public isOpenedSnapshot!: boolean;
  public openedDateSnapshot!: Date | null;
  public quantitySnapshot!: number | null;
  public unitSnapshot!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ExpirationNotification.init(
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
    storedItemId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stored_items',
        key: 'id',
      },
    },
    phase: {
      type: DataTypes.ENUM('initial', 'reminder', 'exit_suggestion'),
      allowNull: false,
    },
    itemNameSnapshot: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    itemHouseholdIdSnapshot: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    storageAreaNameSnapshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    storageAreaIdSnapshot: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    expirationDateSnapshot: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    isOpenedSnapshot: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    openedDateSnapshot: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    quantitySnapshot: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
    },
    unitSnapshot: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'expiration_notifications',
    timestamps: true,
    indexes: [
      { fields: ['householdId'] },
      { fields: ['createdAt'] },
      { fields: ['householdId', 'createdAt'] },
      {
        unique: true,
        fields: ['storedItemId', 'phase'],
        name: 'unique_expiration_notification_per_item_phase',
      },
    ],
  }
);
