import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { BrandCategory, BRAND_CATEGORIES } from '../types/enums';

interface BrandAttributes {
  id: string;
  name: string;
  normalizedName: string;
  domain: string | null;
  color: string | null;
  logoPath: string | null;
  category: BrandCategory | null;
  isCurated: boolean;
  usageCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BrandCreationAttributes
  extends Optional<BrandAttributes, 'domain' | 'color' | 'logoPath' | 'category' | 'isCurated' | 'usageCount' | 'createdAt' | 'updatedAt'> {}

export class Brand extends Model<BrandAttributes, BrandCreationAttributes> implements BrandAttributes {
  public id!: string;
  public name!: string;
  public normalizedName!: string;
  public domain!: string | null;
  public color!: string | null;
  public logoPath!: string | null;
  public category!: BrandCategory | null;
  public isCurated!: boolean;
  public usageCount!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Brand.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    normalizedName: { type: DataTypes.STRING, allowNull: false },
    domain: { type: DataTypes.STRING, allowNull: true },
    color: { type: DataTypes.STRING(7), allowNull: true },
    logoPath: { type: DataTypes.STRING, allowNull: true },
    category: { type: DataTypes.ENUM(...BRAND_CATEGORIES), allowNull: true },
    isCurated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    usageCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    tableName: 'brands',
    timestamps: true,
    indexes: [
      { fields: ['normalizedName'] },
      { fields: ['category'] },
      { fields: ['isCurated'] },
    ],
  }
);
