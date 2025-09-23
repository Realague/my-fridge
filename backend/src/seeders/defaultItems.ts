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
    name: 'tomato',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'carrot',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.BUNCH],
  },
  {
    name: 'onion',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'potato',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.PIECE],
  },
  {
    name: 'bellPepper',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'broccoli',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'cucumber',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'lettuce',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM],
  },
  {
    name: 'spinach',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'garlic',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.OUNCE],
  },
  {
    name: 'ginger',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.PIECE],
  },
  {
    name: 'mushroom',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'zucchini',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'eggplant',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'cauliflower',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'celery',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM],
  },
  {
    name: 'corn',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.CUP, Unit.GRAM, Unit.KILOGRAM],
  },
  // Fruits
  {
    name: 'apple',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'banana',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.BUNCH],
  },
  {
    name: 'orange',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'lemon',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'lime',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'strawberry',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'blueberry',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'grape',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'pineapple',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'mango',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'avocado',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'watermelon',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'cantaloupe',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'peach',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'pear',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'kiwi',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  // Dairy
  {
    name: 'milk',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.LITER,
    availableUnits: [Unit.LITER, Unit.MILLILITER, Unit.CUP, Unit.FLUID_OUNCE, Unit.GALLON],
  },
  {
    name: 'cheese',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.PIECE],
  },
  {
    name: 'eggs',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.DOZEN],
  },
  {
    name: 'butter',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.TABLESPOON],
  },
  {
    name: 'yogurt',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.CUP],
  },
  {
    name: 'cream',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.MILLILITER,
    availableUnits: [Unit.MILLILITER, Unit.LITER, Unit.CUP, Unit.FLUID_OUNCE],
  },
  {
    name: 'sourCream',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.CUP],
  },
  {
    name: 'mozzarella',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'parmesan',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'cheddar',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  // Meat
  {
    name: 'chickenBreast',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE, Unit.PIECE],
  },
  {
    name: 'chickenThigh',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE, Unit.PIECE],
  },
  {
    name: 'groundBeef',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE],
  },
  {
    name: 'beef',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE],
  },
  {
    name: 'pork',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE],
  },
  {
    name: 'bacon',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'salmon',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE, Unit.PIECE],
  },
  {
    name: 'tuna',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE, Unit.PIECE],
  },
  {
    name: 'shrimp',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE],
  },
  {
    name: 'turkey',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE],
  },
  // Grains
  {
    name: 'rice',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.CUP],
  },
  {
    name: 'bread',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'pasta',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'flour',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.CUP],
  },
  {
    name: 'oats',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.CUP],
  },
  {
    name: 'quinoa',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.CUP],
  },
  {
    name: 'cereal',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'crackers',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.PIECE],
  },
  {
    name: 'tortilla',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM],
  },
  {
    name: 'bagel',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM],
  },
  // Spices & Condiments
  {
    name: 'salt',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'blackPepper',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'oregano',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'basil',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'paprika',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'cumin',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'garlicPowder',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'onionPowder',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'chiliPowder',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'cinnamon',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'oliveOil',
    category: ItemCategory.OTHER,
    defaultUnit: Unit.MILLILITER,
    availableUnits: [Unit.MILLILITER, Unit.LITER, Unit.FLUID_OUNCE, Unit.CUP, Unit.TABLESPOON],
  },
  {
    name: 'vinegar',
    category: ItemCategory.OTHER,
    defaultUnit: Unit.MILLILITER,
    availableUnits: [Unit.MILLILITER, Unit.LITER, Unit.FLUID_OUNCE, Unit.TABLESPOON],
  },
  {
    name: 'soySauce',
    category: ItemCategory.OTHER,
    defaultUnit: Unit.MILLILITER,
    availableUnits: [Unit.MILLILITER, Unit.LITER, Unit.FLUID_OUNCE, Unit.TABLESPOON],
  },
  {
    name: 'ketchup',
    category: ItemCategory.OTHER,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.TABLESPOON],
  },
  {
    name: 'mustard',
    category: ItemCategory.OTHER,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.TABLESPOON],
  },
  {
    name: 'mayonnaise',
    category: ItemCategory.OTHER,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.TABLESPOON],
  },
  // Beverages
  {
    name: 'water',
    category: ItemCategory.BEVERAGES,
    defaultUnit: Unit.LITER,
    availableUnits: [Unit.LITER, Unit.MILLILITER, Unit.FLUID_OUNCE, Unit.CUP],
  },
  {
    name: 'coffee',
    category: ItemCategory.BEVERAGES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'tea',
    category: ItemCategory.BEVERAGES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.PIECE],
  },
  {
    name: 'juice',
    category: ItemCategory.BEVERAGES,
    defaultUnit: Unit.LITER,
    availableUnits: [Unit.LITER, Unit.MILLILITER, Unit.FLUID_OUNCE, Unit.CUP],
  },
  {
    name: 'soda',
    category: ItemCategory.BEVERAGES,
    defaultUnit: Unit.LITER,
    availableUnits: [Unit.LITER, Unit.MILLILITER, Unit.FLUID_OUNCE, Unit.CUP],
  },
  // Snacks
  {
    name: 'nuts',
    category: ItemCategory.SNACKS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'almonds',
    category: ItemCategory.SNACKS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'peanuts',
    category: ItemCategory.SNACKS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'chips',
    category: ItemCategory.SNACKS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'chocolate',
    category: ItemCategory.SNACKS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.PIECE],
  },
  {
    name: 'cookies',
    category: ItemCategory.SNACKS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.PIECE],
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