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

  // Tasks 2-6 fill in the rest
  await sequelize.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
