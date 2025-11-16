import * as fs from 'fs';
import * as path from 'path';
import { Sequelize } from 'sequelize';
import { Item } from '../models/Item';
import { ItemCategory, Unit } from '../types/enums';
import dotenv from 'dotenv';

dotenv.config();

// CSV format: nameKey, frenchName, image, category, englishName, spanishName
const CSV_PATH = process.env.CSV_PATH || path.join(__dirname, 'output_with_categories_and_en_v4_slug_from_col5_camel.csv');

// Get database name from command line argument or environment variable
const DB_NAME = process.argv[2] || process.env.DB_NAME || 'my_fridge_db';

// Create a custom Sequelize instance with the specified database
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: DB_NAME,
  logging: false,
});

// Cloudinary base URL for images
const CLOUDINARY_BASE_URL = 'https://res.cloudinary.com/your-cloud-name/image/upload/v1/items';

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
function getAvailableUnits(category: ItemCategory): Unit[] {
  switch (category) {
    case ItemCategory.VEGETABLES:
    case ItemCategory.FRUITS:
    case ItemCategory.MEAT:
      return [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM, Unit.BUNCH];
    case ItemCategory.DAIRY:
      return [Unit.MILLILITER, Unit.LITER, Unit.PIECE, Unit.GRAM];
    case ItemCategory.GRAINS:
      return [Unit.GRAM, Unit.KILOGRAM, Unit.CUP, Unit.TABLESPOON];
    case ItemCategory.SPICES:
      return [Unit.GRAM, Unit.TEASPOON, Unit.TABLESPOON, Unit.PIECE];
    case ItemCategory.BEVERAGES:
      return [Unit.MILLILITER, Unit.LITER, Unit.PIECE];
    case ItemCategory.SNACKS:
    case ItemCategory.FROZEN:
    case ItemCategory.CANNED:
      return [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM, Unit.PACK];
    case ItemCategory.CONDIMENTS:
      return [Unit.MILLILITER, Unit.LITER, Unit.GRAM, Unit.TABLESPOON, Unit.TEASPOON];
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

async function seedItems() {
  try {
    console.log('Starting item seeding from CSV...\n');
    console.log(`Target database: ${DB_NAME}\n`);
    
    // Check if CSV file exists
    if (!fs.existsSync(CSV_PATH)) {
      console.error(`CSV file not found at: ${CSV_PATH}`);
      console.log('Please ensure the CSV file is in the scripts directory.');
      process.exit(1);
    }
    
    // Initialize Item model with this sequelize instance
    Item.init(Item.getAttributes(), { sequelize });
    
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
      
      // Build image URL
      let imageUrl: string | null = null;
      if (imageName && imageName.trim() !== '') {
        // For now, we'll use a placeholder. You can update this with actual Cloudinary URLs
        // imageUrl = `${CLOUDINARY_BASE_URL}/${imageName}`;
        imageUrl = imageName; // Store just the filename for now
      }
      
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
        console.error(`Error creating batch starting at index ${i}:`, error.message);
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

