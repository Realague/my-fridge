import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { BarcodeFormat, BARCODE_FORMATS } from '../types/enums';
import { Item } from './Item';
import { User } from './User';

/**
 * Global, cross-household barcode → catalog item mapping.
 *
 * When a user scans a product barcode and confirms which catalog `Item` it
 * corresponds to, the association is stored here and shared with every other
 * household: the next person to scan the same barcode benefits from the mapping
 * without redoing the work.
 *
 * Conflict resolution: several rows may exist for the same `barcode` (different
 * households mapped it to different items). At scan time the mapping with the
 * highest `validatedCount` wins; each confirmation increments the count. There
 * is a unique constraint on (barcode, itemId) so re-confirming the same pair
 * updates the existing row instead of inserting a duplicate.
 *
 * V1 scope: no per-household override table and no offline cache sync — both are
 * deferred to a later iteration.
 */
interface BarcodeMappingAttributes {
  id: string;
  barcode: string;
  itemId: string;
  format: BarcodeFormat | null;
  confidence: number;
  validatedCount: number;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BarcodeMappingCreationAttributes
  extends Optional<
    BarcodeMappingAttributes,
    'id' | 'format' | 'confidence' | 'validatedCount' | 'createdBy' | 'createdAt' | 'updatedAt'
  > {}

export class BarcodeMapping
  extends Model<BarcodeMappingAttributes, BarcodeMappingCreationAttributes>
  implements BarcodeMappingAttributes
{
  public id!: string;
  public barcode!: string;
  public itemId!: string;
  public format!: BarcodeFormat | null;
  public confidence!: number;
  public validatedCount!: number;
  public createdBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association helpers
  public readonly item?: Item;
  public readonly creator?: User;
}

BarcodeMapping.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'item_id',
      references: {
        model: 'items',
        key: 'id',
      },
    },
    format: {
      type: DataTypes.ENUM(...BARCODE_FORMATS),
      allowNull: true,
      defaultValue: null,
    },
    confidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 0.7,
      get() {
        const value = this.getDataValue('confidence');
        return value === null || value === undefined ? 0 : Number(value);
      },
    },
    validatedCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'validated_count',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'barcode_mappings',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['barcode'] },
      { unique: true, fields: ['barcode', 'item_id'], name: 'unique_barcode_item' },
    ],
  }
);

export { BarcodeMapping as default };
