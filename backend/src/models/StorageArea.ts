import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { StorageAreaType, STORAGE_AREA_TYPES } from '../types/enums';

// These are all the attributes in the StorageArea model
interface StorageAreaAttributes {
  id: string;
  name: string;
  emoji: string;
  type: StorageAreaType;
  householdId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Some attributes are optional in `StorageArea.build()` and `StorageArea.create()`
interface StorageAreaCreationAttributes extends Optional<StorageAreaAttributes, 'id' | 'emoji' | 'type' | 'createdAt' | 'updatedAt'> {}

export class StorageArea extends Model<StorageAreaAttributes, StorageAreaCreationAttributes> implements StorageAreaAttributes {
  public id!: string;
  public name!: string;
  public emoji!: string;
  public type!: StorageAreaType;
  public householdId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association attributes
  public readonly household?: any;
}

StorageArea.init(
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
    emoji: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '📦',
    },
    type: {
      type: DataTypes.ENUM(...STORAGE_AREA_TYPES),
      allowNull: false,
      defaultValue: StorageAreaType.OTHER,
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'households',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'storage_areas',
    timestamps: true,
  }
); 