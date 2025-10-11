import { ItemRepository } from '../repositories/ItemRepository';
import { ItemCategory, Unit } from '../types/enums';
import { CreateItemDto } from '../types/ItemDto';

export interface DefaultItem {
  name: string;
  nameKey: string;
  category: ItemCategory;
  defaultUnit: Unit;
  availableUnits: Unit[];
}

export const DEFAULT_ITEMS: DefaultItem[] = [
  // Vegetables
  {
    name: 'tomato',
    nameKey: 'tomato',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'carrot',
    nameKey: 'carrot',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.BUNCH],
  },
  {
    name: 'onion',
    nameKey: 'onion',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'potato',
    nameKey: 'potato',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.PIECE],
  },
  {
    name: 'bellPepper',
    nameKey: 'bellPepper',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'broccoli',
    nameKey: 'broccoli',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'cucumber',
    nameKey: 'cucumber',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'lettuce',
    nameKey: 'lettuce',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM],
  },
  {
    name: 'spinach',
    nameKey: 'spinach',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'garlic',
    nameKey: 'garlic',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.OUNCE],
  },
  {
    name: 'ginger',
    nameKey: 'ginger',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.PIECE],
  },
  {
    name: 'mushroom',
    nameKey: 'mushroom',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'zucchini',
    nameKey: 'zucchini',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'eggplant',
    nameKey: 'eggplant',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'cauliflower',
    nameKey: 'cauliflower',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'celery',
    nameKey: 'celery',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM],
  },
  {
    name: 'corn',
    nameKey: 'corn',
    category: ItemCategory.VEGETABLES,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.CUP, Unit.GRAM, Unit.KILOGRAM],
  },
  // Fruits
  {
    name: 'apple',
    nameKey: 'apple',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'banana',
    nameKey: 'banana',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.BUNCH],
  },
  {
    name: 'orange',
    nameKey: 'orange',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'lemon',
    nameKey: 'lemon',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'lime',
    nameKey: 'lime',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'strawberry',
    nameKey: 'strawberry',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'blueberry',
    nameKey: 'blueberry',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'grape',
    nameKey: 'grape',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'pineapple',
    nameKey: 'pineapple',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'mango',
    nameKey: 'mango',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'avocado',
    nameKey: 'avocado',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'watermelon',
    nameKey: 'watermelon',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'cantaloupe',
    nameKey: 'cantaloupe',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'peach',
    nameKey: 'peach',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'pear',
    nameKey: 'pear',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  {
    name: 'kiwi',
    nameKey: 'kiwi',
    category: ItemCategory.FRUITS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.KILOGRAM, Unit.GRAM, Unit.POUND],
  },
  // Dairy
  {
    name: 'milk',
    nameKey: 'milk',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.LITER,
    availableUnits: [Unit.LITER, Unit.MILLILITER, Unit.CUP, Unit.FLUID_OUNCE, Unit.GALLON],
  },
  {
    name: 'cheese',
    nameKey: 'cheese',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.PIECE],
  },
  {
    name: 'eggs',
    nameKey: 'eggs',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.DOZEN],
  },
  {
    name: 'butter',
    nameKey: 'butter',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.TABLESPOON],
  },
  {
    name: 'yogurt',
    nameKey: 'yogurt',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.CUP],
  },
  {
    name: 'cream',
    nameKey: 'cream',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.MILLILITER,
    availableUnits: [Unit.MILLILITER, Unit.LITER, Unit.CUP, Unit.FLUID_OUNCE],
  },
  {
    name: 'sourCream',
    nameKey: 'sourCream',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.CUP],
  },
  {
    name: 'mozzarella',
    nameKey: 'mozzarella',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'parmesan',
    nameKey: 'parmesan',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'cheddar',
    nameKey: 'cheddar',
    category: ItemCategory.DAIRY,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  // Meat
  {
    name: 'chickenBreast',
    nameKey: 'chickenBreast',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE, Unit.PIECE],
  },
  {
    name: 'chickenThigh',
    nameKey: 'chickenThigh',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE, Unit.PIECE],
  },
  {
    name: 'groundBeef',
    nameKey: 'groundBeef',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE],
  },
  {
    name: 'beef',
    nameKey: 'beef',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE],
  },
  {
    name: 'pork',
    nameKey: 'pork',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE],
  },
  {
    name: 'bacon',
    nameKey: 'bacon',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'salmon',
    nameKey: 'salmon',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE, Unit.PIECE],
  },
  {
    name: 'tuna',
    nameKey: 'tuna',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE, Unit.PIECE],
  },
  {
    name: 'shrimp',
    nameKey: 'shrimp',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE],
  },
  {
    name: 'turkey',
    nameKey: 'turkey',
    category: ItemCategory.MEAT,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.OUNCE],
  },
  // Grains
  {
    name: 'rice',
    nameKey: 'rice',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.CUP],
  },
  {
    name: 'bread',
    nameKey: 'bread',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'pasta',
    nameKey: 'pasta',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'flour',
    nameKey: 'flour',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.KILOGRAM,
    availableUnits: [Unit.KILOGRAM, Unit.GRAM, Unit.POUND, Unit.CUP],
  },
  {
    name: 'oats',
    nameKey: 'oats',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.CUP],
  },
  {
    name: 'quinoa',
    nameKey: 'quinoa',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.CUP],
  },
  {
    name: 'cereal',
    nameKey: 'cereal',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'crackers',
    nameKey: 'crackers',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.PIECE],
  },
  {
    name: 'tortilla',
    nameKey: 'tortilla',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM],
  },
  {
    name: 'bagel',
    nameKey: 'bagel',
    category: ItemCategory.GRAINS,
    defaultUnit: Unit.PIECE,
    availableUnits: [Unit.PIECE, Unit.GRAM, Unit.KILOGRAM],
  },
  // Spices & Condiments
  {
    name: 'salt',
    nameKey: 'salt',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'blackPepper',
    nameKey: 'blackPepper',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'oregano',
    nameKey: 'oregano',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'basil',
    nameKey: 'basil',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'paprika',
    nameKey: 'paprika',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'cumin',
    nameKey: 'cumin',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'garlicPowder',
    nameKey: 'garlicPowder',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'onionPowder',
    nameKey: 'onionPowder',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'chiliPowder',
    nameKey: 'chiliPowder',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'cinnamon',
    nameKey: 'cinnamon',
    category: ItemCategory.SPICES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.OUNCE, Unit.TEASPOON, Unit.TABLESPOON],
  },
  {
    name: 'oliveOil',
    nameKey: 'oliveOil',
    category: ItemCategory.OTHER,
    defaultUnit: Unit.MILLILITER,
    availableUnits: [Unit.MILLILITER, Unit.LITER, Unit.FLUID_OUNCE, Unit.CUP, Unit.TABLESPOON],
  },
  {
    name: 'vinegar',
    nameKey: 'vinegar',
    category: ItemCategory.OTHER,
    defaultUnit: Unit.MILLILITER,
    availableUnits: [Unit.MILLILITER, Unit.LITER, Unit.FLUID_OUNCE, Unit.TABLESPOON],
  },
  {
    name: 'soySauce',
    nameKey: 'soySauce',
    category: ItemCategory.OTHER,
    defaultUnit: Unit.MILLILITER,
    availableUnits: [Unit.MILLILITER, Unit.LITER, Unit.FLUID_OUNCE, Unit.TABLESPOON],
  },
  {
    name: 'ketchup',
    nameKey: 'ketchup',
    category: ItemCategory.OTHER,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.TABLESPOON],
  },
  {
    name: 'mustard',
    nameKey: 'mustard',
    category: ItemCategory.OTHER,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.TABLESPOON],
  },
  {
    name: 'mayonnaise',
    nameKey: 'mayonnaise',
    category: ItemCategory.OTHER,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.TABLESPOON],
  },
  // Beverages
  {
    name: 'water',
    nameKey: 'water',
    category: ItemCategory.BEVERAGES,
    defaultUnit: Unit.LITER,
    availableUnits: [Unit.LITER, Unit.MILLILITER, Unit.FLUID_OUNCE, Unit.CUP],
  },
  {
    name: 'coffee',
    nameKey: 'coffee',
    category: ItemCategory.BEVERAGES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'tea',
    nameKey: 'tea',
    category: ItemCategory.BEVERAGES,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.PIECE],
  },
  {
    name: 'juice',
    nameKey: 'juice',
    category: ItemCategory.BEVERAGES,
    defaultUnit: Unit.LITER,
    availableUnits: [Unit.LITER, Unit.MILLILITER, Unit.FLUID_OUNCE, Unit.CUP],
  },
  {
    name: 'soda',
    nameKey: 'soda',
    category: ItemCategory.BEVERAGES,
    defaultUnit: Unit.LITER,
    availableUnits: [Unit.LITER, Unit.MILLILITER, Unit.FLUID_OUNCE, Unit.CUP],
  },
  // Snacks
  {
    name: 'nuts',
    nameKey: 'nuts',
    category: ItemCategory.SNACKS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'almonds',
    nameKey: 'almonds',
    category: ItemCategory.SNACKS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'peanuts',
    nameKey: 'peanuts',
    category: ItemCategory.SNACKS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'chips',
    nameKey: 'chips',
    category: ItemCategory.SNACKS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND],
  },
  {
    name: 'chocolate',
    nameKey: 'chocolate',
    category: ItemCategory.SNACKS,
    defaultUnit: Unit.GRAM,
    availableUnits: [Unit.GRAM, Unit.KILOGRAM, Unit.OUNCE, Unit.POUND, Unit.PIECE],
  },
  {
    name: 'cookies',
    nameKey: 'cookies',
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
        console.info('Items already exist in database, skipping seeding');
        return;
      }

      console.info('🌱 Seeding basic items with available units...');
      
      for (const defaultItem of DEFAULT_ITEMS) {
        await this.createItem(defaultItem, null, null);
      }

      console.info(`✅ Successfully seeded ${DEFAULT_ITEMS.length} items with available units`);
    } catch (error) {
      console.error('❌ Failed to seed basic items:', error);
      throw error;
    }
  }

  private async createItem(defaultItem: DefaultItem, createdBy: string | null, householdId: string | null): Promise<void> {
    const itemData: CreateItemDto = {
      name: defaultItem.name,
      nameKey: defaultItem.nameKey,
      category: defaultItem.category,
      defaultUnit: defaultItem.defaultUnit,
      availableUnits: defaultItem.availableUnits,
      createdBy: createdBy || null,
      householdId: householdId || null,
    };

    await this.itemRepository.create(itemData);
  }
} 