import { ItemRepository } from '../repositories/ItemRepository';
import { ItemCategory, Unit } from '../types/enums';
import { CreateItemDto } from '../types/ItemDto';

export interface DefaultItem {
  name: string;
  category: ItemCategory;
  defaultUnit: Unit;
  availableUnits: Unit[];
}

export const DEFAULT_ITEMS: DefaultItem[] = [
  // Vegetables
  {
    name: 'Tomato',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'Carrot',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.BUNCH],
  },
  {
    name: 'Onion',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'Potato',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.PIECE],
  },
  // Fruits
  {
    name: 'Apple',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'Banana',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.BUNCH],
  },
  {
    name: 'Orange',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  // Dairy
  {
    name: 'Milk',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.LITER,
    availableUnits: [Unit.LITER, Unit.MILLILITER, Unit.CUP, Unit.FLUID_OUNCE, Unit.PINT, Unit.QUART, Unit.GALLON],
  },
  {
    name: 'Cheese',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.PIECE],
  },
  {
    name: 'Eggs',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.DOZEN],
  },
  // Meat
  {
    name: 'Chicken Breast',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE, Unit.PIECE],
  },
  // Grains
  {
    name: 'Rice',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.CUP],
  },
  {
    name: 'Bread',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  // Spices
  {
    name: 'Salt',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'Black Pepper',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
];

export class ItemSeeder {
  constructor(private itemRepository: ItemRepository) {}

  async seedBasicItems(createdBy?: string): Promise<void> {
    try {
      // Check if items already exist
      const { items: existingItems } = await this.itemRepository.findAll({ limit: 1 });
      
      if (existingItems.length > 0) {
        console.log('Items already exist in database, skipping seeding');
        return;
      }

      console.log('🌱 Seeding basic items with available units...');
      
      for (const defaultItem of DEFAULT_ITEMS) {
        await this.createItem(defaultItem, null, null);
      }

      console.log(`✅ Successfully seeded ${DEFAULT_ITEMS.length} items with available units`);
    } catch (error) {
      console.error('❌ Failed to seed basic items:', error);
      throw error;
    }
  }

  private async createItem(defaultItem: DefaultItem, createdBy: string | null, householdId: string | null): Promise<void> {
    const itemData: CreateItemDto = {
      name: defaultItem.name,
      category: defaultItem.category,
      defaultUnit: defaultItem.defaultUnit,
      availableUnits: defaultItem.availableUnits,
      createdBy: createdBy || null,
      householdId: householdId || null,
    };

    await this.itemRepository.create(itemData);
    console.log(`  ✓ Created item: ${defaultItem.name} (${defaultItem.availableUnits.length} available units)`);
  }
} 