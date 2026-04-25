import * as fs from 'fs';
import * as path from 'path';
import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import { ItemCategory, Unit, ITEM_CATEGORIES, UNITS, isCatalogStorageUnitForCategory } from '../types/enums';
import { uploadImageToCloudinary } from '../utils/imageUploader';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_CSV = path.join(__dirname, 'manquants_full.csv');
const DEFAULT_IMAGES_DIR = path.join(__dirname, 'img');

// CLI: ts-node seedItemsIncremental.ts [--csv <path>] [--images <dir>] [--db <name>] [--port <port>] [--dry-run]
function parseArgs(): {
  csvPath: string;
  imagesDir: string;
  dbName: string;
  dbPort: number;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
  };
  const has = (flag: string): boolean => args.includes(flag);

  return {
    csvPath: path.resolve(get('--csv') || DEFAULT_CSV),
    imagesDir: path.resolve(get('--images') || DEFAULT_IMAGES_DIR),
    dbName: get('--db') || process.env.DB_NAME || 'my_fridge_db',
    dbPort: parseInt(get('--port') || process.env.DB_PORT || '5432'),
    dryRun: has('--dry-run'),
  };
}

const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/duxpbou8b/image/upload/v1763055075/items';

// CSV format: nameKey, frenchName, image, category, englishName, spanishName, defaultUnit?, availableUnits?, daysAfterOpening?
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += c;
  }
  result.push(current.trim());
  return result;
}

const CATEGORY_MAP: { [k: string]: ItemCategory } = {
  vegetables: ItemCategory.VEGETABLES, fruits: ItemCategory.FRUITS,
  meat: ItemCategory.MEAT, fish: ItemCategory.FISH, seafood: ItemCategory.SEAFOOD,
  dairy: ItemCategory.DAIRY, grains: ItemCategory.GRAINS, spices: ItemCategory.SPICES,
  beverages: ItemCategory.BEVERAGES, snacks: ItemCategory.SNACKS,
  condiments: ItemCategory.CONDIMENTS, frozen: ItemCategory.FROZEN,
  canned: ItemCategory.CANNED, meal: ItemCategory.MEAL,
  preparation: ItemCategory.PREPARATION,
  cleaning_products: ItemCategory.CLEANING_PRODUCTS,
  other: ItemCategory.OTHER,
};

function getAvailableUnits(category: ItemCategory): Unit[] {
  switch (category) {
    case ItemCategory.MEAL: return [Unit.PIECE, Unit.SERVING];
    case ItemCategory.VEGETABLES:
    case ItemCategory.FRUITS:
    case ItemCategory.MEAT:
    case ItemCategory.FISH:
    case ItemCategory.SEAFOOD: return [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM];
    case ItemCategory.DAIRY: return [Unit.MILLILITER, Unit.LITER, Unit.PIECE, Unit.GRAM];
    case ItemCategory.GRAINS: return [Unit.GRAM, Unit.KILOGRAM, Unit.PIECE];
    case ItemCategory.SPICES: return [Unit.GRAM, Unit.PIECE];
    case ItemCategory.BEVERAGES: return [Unit.MILLILITER, Unit.LITER, Unit.PIECE];
    case ItemCategory.SNACKS:
    case ItemCategory.FROZEN:
    case ItemCategory.CANNED: return [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM];
    case ItemCategory.CONDIMENTS: return [Unit.MILLILITER, Unit.LITER, Unit.GRAM, Unit.PIECE];
    default: return [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM];
  }
}

function getDefaultUnit(category: ItemCategory): Unit {
  switch (category) {
    case ItemCategory.BEVERAGES:
    case ItemCategory.DAIRY:
    case ItemCategory.CONDIMENTS: return Unit.MILLILITER;
    case ItemCategory.GRAINS:
    case ItemCategory.SPICES: return Unit.GRAM;
    default: return Unit.PIECE;
  }
}

interface ParsedRow {
  nameKey: string;
  imageName: string;
  category: ItemCategory;
  defaultUnit: Unit;
  availableUnits: Unit[];
}

function readCSV(csvPath: string): { rows: ParsedRow[]; errors: string[] } {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  const rows: ParsedRow[] = [];
  const errors: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const parts = parseCSVLine(line);
    if (parts.length < 6 || parts[0] === 'nameKey' || !parts[0]) continue;
    const [nameKey, , imageName, categoryStr] = parts;
    if (!nameKey || nameKey.trim() === '') {
      errors.push(`Line ${i + 1}: missing nameKey`);
      continue;
    }
    const category = CATEGORY_MAP[(categoryStr || 'other').toLowerCase()] || ItemCategory.OTHER;
    rows.push({
      nameKey: nameKey.trim(),
      imageName: (imageName || '').trim(),
      category,
      defaultUnit: getDefaultUnit(category),
      availableUnits: getAvailableUnits(category),
    });
  }
  return { rows, errors };
}

interface ItemAttrs {
  id: string;
  name: string;
  category: ItemCategory;
  defaultUnit: Unit;
  availableUnits: Unit[];
  daysAfterOpening: number | null;
  imageUrl: string | null;
  householdId: string | null;
  createdBy: string | null;
}
interface ItemCreate extends Optional<ItemAttrs, 'id' | 'defaultUnit' | 'availableUnits' | 'daysAfterOpening'> {}

class ItemModel extends Model<ItemAttrs, ItemCreate> implements ItemAttrs {
  public id!: string;
  public name!: string;
  public category!: ItemCategory;
  public defaultUnit!: Unit;
  public availableUnits!: Unit[];
  public daysAfterOpening!: number | null;
  public imageUrl!: string | null;
  public householdId!: string | null;
  public createdBy!: string | null;
}

function initItemModel(sequelize: Sequelize) {
  ItemModel.init(
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false, validate: { len: [1, 100] } },
      category: { type: DataTypes.ENUM(...ITEM_CATEGORIES), allowNull: false, defaultValue: ItemCategory.OTHER },
      defaultUnit: { type: DataTypes.ENUM(...UNITS), allowNull: false, defaultValue: Unit.PIECE },
      availableUnits: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [Unit.PIECE],
        validate: {
          isValidUnitsArray(value: any) {
            if (!Array.isArray(value) || value.length === 0) throw new Error('availableUnits must be non-empty array');
            const category = (this as unknown as ItemModel).get('category') as ItemCategory;
            for (const unit of value) {
              if (!UNITS.includes(unit)) throw new Error(`Invalid unit: ${unit}`);
              if (!isCatalogStorageUnitForCategory(unit, category)) throw new Error(`Unit ${unit} not allowed for category ${category}`);
            }
          },
        },
      },
      daysAfterOpening: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
      householdId: { type: DataTypes.UUID, allowNull: true, references: { model: 'households', key: 'id' } },
      imageUrl: { type: DataTypes.STRING, allowNull: true },
      createdBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
    },
    { sequelize, tableName: 'items', timestamps: true }
  );
}

async function computeDelta(rows: ParsedRow[]): Promise<{ newRows: ParsedRow[]; existingCount: number }> {
  const existing = await ItemModel.findAll({
    where: { householdId: null },
    attributes: ['name'],
  });
  const existingNames = new Set(existing.map((i) => i.name));
  const newRows = rows.filter((r) => !existingNames.has(r.nameKey));
  return { newRows, existingCount: existing.length };
}

async function main() {
  const opts = parseArgs();
  console.log(`CSV: ${opts.csvPath}`);
  console.log(`Images: ${opts.imagesDir}`);
  console.log(`DB: ${opts.dbName} @ port ${opts.dbPort}`);
  console.log(`Dry-run: ${opts.dryRun}\n`);

  if (!fs.existsSync(opts.csvPath)) {
    console.error(`CSV file not found: ${opts.csvPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(opts.imagesDir)) {
    console.error(`Images directory not found: ${opts.imagesDir}`);
    process.exit(1);
  }

  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: opts.dbPort,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: opts.dbName,
    logging: false,
  });

  await sequelize.authenticate();
  console.log('Database connected.\n');

  const { rows, errors } = readCSV(opts.csvPath);
  console.log(`Parsed ${rows.length} valid rows from CSV.`);
  if (errors.length > 0) {
    console.log(`Encountered ${errors.length} parse errors:`);
    errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    if (errors.length > 10) console.log(`  ... and ${errors.length - 10} more`);
  }

  initItemModel(sequelize);
  const { newRows, existingCount } = await computeDelta(rows);
  console.log(`\nExisting global items in DB: ${existingCount}`);
  console.log(`New items to insert: ${newRows.length}`);
  if (newRows.length === 0) {
    console.log('Nothing to do.');
    await sequelize.close();
    return;
  }
  console.log('First 10 new items:');
  newRows.slice(0, 10).forEach((r) => console.log(`  - ${r.nameKey} [${r.category}] image=${r.imageName || 'none'}`));

  // Tasks 2-6 fill in the rest
  await sequelize.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
