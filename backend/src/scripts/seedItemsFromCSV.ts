import * as fs from 'fs';
import * as path from 'path';
import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import { ItemCategory, Unit, ITEM_CATEGORIES, UNITS, STORAGE_UNITS } from '../types/enums';
import dotenv from 'dotenv';

dotenv.config();

// CSV format: nameKey, frenchName, image, category, englishName, spanishName
const CSV_PATH = process.env.CSV_PATH || path.join(__dirname, 'output_with_categories_and_en_v4_slug_from_col5_camel.csv');

// CLI: ts-node seedItemsFromCSV.ts [dbName] [port]
const DB_NAME = process.argv[2] || process.env.DB_NAME || 'my_fridge_db';
const DB_PORT = parseInt(process.argv[3] || process.env.DB_PORT || '5432');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: DB_PORT,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: DB_NAME,
  logging: false,
});

// Cloudinary base URL for images
const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/duxpbou8b/image/upload/v1763055075/items';

// Define Item model locally for seeding
interface ItemAttributes {
  id: string;
  name: string;
  category: ItemCategory;
  defaultUnit: Unit;
  availableUnits: Unit[];
  daysAfterOpening: number | null;
  imageUrl: string | null;
  householdId: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ItemCreationAttributes extends Optional<ItemAttributes, 'id' | 'defaultUnit' | 'availableUnits' | 'daysAfterOpening' | 'createdAt' | 'updatedAt'> {}

class ItemModel extends Model<ItemAttributes, ItemCreationAttributes> implements ItemAttributes {
  public id!: string;
  public name!: string;
  public category!: ItemCategory;
  public defaultUnit!: Unit;
  public availableUnits!: Unit[];
  public daysAfterOpening!: number | null;
  public imageUrl!: string | null;
  public createdBy!: string | null;
  public householdId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ItemModel.init(
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
    category: {
      type: DataTypes.ENUM(...ITEM_CATEGORIES),
      allowNull: false,
      defaultValue: ItemCategory.OTHER,
    },
    defaultUnit: {
      type: DataTypes.ENUM(...UNITS),
      allowNull: false,
      defaultValue: Unit.PIECE,
    },
    availableUnits: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [Unit.PIECE],
      validate: {
        isValidUnitsArray(value: any) {
          if (!Array.isArray(value)) {
            throw new Error('Available units must be an array');
          }
          if (value.length === 0) {
            throw new Error('Available units array cannot be empty');
          }
          for (const unit of value) {
            if (!UNITS.includes(unit)) {
              throw new Error(`Invalid unit: ${unit}`);
            }
            if (!STORAGE_UNITS.includes(unit)) {
              throw new Error(`Unit ${unit} is only available for recipes, not for storage items`);
            }
          }
        },
      },
    },
    daysAfterOpening: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    householdId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'households',
        key: 'id',
      },
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'items',
    timestamps: true,
  }
);

const Item = ItemModel;

// Map CSV categories to our ItemCategory enum
const CATEGORY_MAP: { [key: string]: ItemCategory } = {
  'vegetables': ItemCategory.VEGETABLES,
  'fruits': ItemCategory.FRUITS,
  'meat': ItemCategory.MEAT,
  'dairy': ItemCategory.DAIRY,
  'grains': ItemCategory.GRAINS,
  'spices': ItemCategory.SPICES,
  'beverages': ItemCategory.BEVERAGES,
  'snacks': ItemCategory.SNACKS,
  'condiments': ItemCategory.CONDIMENTS,
  'frozen': ItemCategory.FROZEN,
  'canned': ItemCategory.CANNED,
  'meal': ItemCategory.MEAL,
  'preparation': ItemCategory.PREPARATION,
  'cleaning_products': ItemCategory.CLEANING_PRODUCTS,
  'other': ItemCategory.OTHER,
};

// Proper CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Get appropriate available units for a category
// Note: Only STORAGE_UNITS are allowed (CUP, TABLESPOON, TEASPOON are recipe-only units)
function getAvailableUnits(category: ItemCategory): Unit[] {
  switch (category) {
    case ItemCategory.VEGETABLES:
    case ItemCategory.FRUITS:
    case ItemCategory.MEAT:
      return [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM, Unit.BUNCH];
    case ItemCategory.DAIRY:
      return [Unit.MILLILITER, Unit.LITER, Unit.PIECE, Unit.GRAM];
    case ItemCategory.GRAINS:
      return [Unit.GRAM, Unit.KILOGRAM, Unit.PIECE];
    case ItemCategory.SPICES:
      return [Unit.GRAM, Unit.PIECE];
    case ItemCategory.BEVERAGES:
      return [Unit.MILLILITER, Unit.LITER, Unit.PIECE];
    case ItemCategory.SNACKS:
    case ItemCategory.FROZEN:
    case ItemCategory.CANNED:
      return [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM, Unit.PACK];
    case ItemCategory.CONDIMENTS:
      return [Unit.MILLILITER, Unit.LITER, Unit.GRAM, Unit.PIECE];
    default:
      return [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM];
  }
}

// Get default unit for a category
function getDefaultUnit(category: ItemCategory): Unit {
  switch (category) {
    case ItemCategory.BEVERAGES:
    case ItemCategory.DAIRY:
    case ItemCategory.CONDIMENTS:
      return Unit.MILLILITER;
    case ItemCategory.GRAINS:
    case ItemCategory.SPICES:
      return Unit.GRAM;
    default:
      return Unit.PIECE;
  }
}

// Build full Cloudinary image URL from nameKey
// Images in Cloudinary are stored as: {CLOUDINARY_BASE_URL}/{nameKey}.jpg
function buildImageUrl(nameKey: string, hasImage: boolean): string | null {
  if (!hasImage) {
    return null;
  }
  
  // Return full Cloudinary URL using the camelCase nameKey
  return `${CLOUDINARY_BASE_URL}/${nameKey}.jpg`;
}

async function seedItems() {
  try {
    console.log('Starting item seeding from CSV...\n');
    console.log(`Target database: ${DB_NAME} (port ${DB_PORT})\n`);
    
    // Check if CSV file exists
    if (!fs.existsSync(CSV_PATH)) {
      console.error(`CSV file not found at: ${CSV_PATH}`);
      console.log('Please ensure the CSV file is in the scripts directory.');
      process.exit(1);
    }
    
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected successfully.\n');
    
    // Read CSV file
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    console.log(`Found ${lines.length} lines in CSV file.\n`);
    
    // Parse CSV and prepare items
    const itemsToCreate: any[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      const parts = parseCSVLine(line);
      
      // Skip if not enough parts or if it's a header
      if (parts.length < 6 || parts[0] === 'nameKey' || !parts[0]) {
        continue;
      }
      
      const [nameKey, frenchName, imageName, categoryStr, englishName, spanishName] = parts;
      
      // Validate nameKey
      if (!nameKey || nameKey.trim() === '') {
        errors.push(`Line ${i + 1}: Missing nameKey`);
        continue;
      }
      
      // Map category
      const category = CATEGORY_MAP[(categoryStr || 'other').toLowerCase()] || ItemCategory.OTHER;
      
      // Build full Cloudinary image URL (only if image exists in CSV)
      const imageUrl = buildImageUrl(nameKey, !!(imageName && imageName.trim()));
      
      // Create item data
      itemsToCreate.push({
        name: nameKey, // Store nameKey as the name for global items
        category,
        defaultUnit: getDefaultUnit(category),
        availableUnits: getAvailableUnits(category),
        imageUrl,
        householdId: null, // Global items
        createdBy: null, // System-created
        daysAfterOpening: null,
      });
    }
    
    console.log(`Parsed ${itemsToCreate.length} valid items from CSV.`);
    
    if (errors.length > 0) {
      console.log(`\nEncountered ${errors.length} errors:`);
      errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more`);
      }
    }
    
    // Check for existing global items
    const existingItems = await Item.findAll({
      where: { householdId: null },
      attributes: ['name'],
    });
    
    const existingNames = new Set(existingItems.map(item => item.name));
    console.log(`\nFound ${existingNames.size} existing global items in database.`);
    
    // Filter out items that already exist
    const newItems = itemsToCreate.filter(item => !existingNames.has(item.name));
    
    if (newItems.length === 0) {
      console.log('\n✅ All items already exist in the database. Nothing to seed.');
      await sequelize.close();
      process.exit(0);
    }
    
    console.log(`\nSeeding ${newItems.length} new items...`);
    
    // Bulk create items in batches
    const BATCH_SIZE = 100;
    let created = 0;
    
    for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
      const batch = newItems.slice(i, i + BATCH_SIZE);
      
      try {
        await Item.bulkCreate(batch, {
          validate: true,
          individualHooks: false,
        });
        
        created += batch.length;
        console.log(`  Created ${created}/${newItems.length} items...`);
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || JSON.stringify(error);
        console.error(`Error creating batch starting at index ${i}:`, errorMessage);
        if (error?.errors) {
          console.error('  Validation errors:', error.errors.map((e: any) => e.message).join(', '));
        }
        // Continue with next batch
      }
    }
    
    console.log(`\n✅ Successfully seeded ${created} items!`);
    console.log(`\nTotal global items in database: ${existingNames.size + created}`);
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('Error seeding items:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// Run the seed function
seedItems();

