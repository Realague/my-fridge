import {
  Apple,
  Beef,
  CupSoda,
  Flame,
  LucideIcon,
  Milk,
  Snowflake,
  Sparkles,
  ShoppingBasket,
} from 'lucide-react';
import { ItemCategory } from '@/types/enums';

/**
 * Supermarket aisles. Each aisle groups several `ItemCategory` values so that
 * the shopping list can follow the route through the store.
 */
export enum Aisle {
  PRODUCE = 'produce',
  BUTCHER = 'butcher',
  DAIRY = 'dairy',
  GROCERY = 'grocery',
  SPICES = 'spices',
  FROZEN = 'frozen',
  BEVERAGES_SNACKS = 'beverages_snacks',
  OTHER = 'other',
}

export const DEFAULT_AISLE_ORDER: Aisle[] = [
  Aisle.PRODUCE,
  Aisle.BUTCHER,
  Aisle.DAIRY,
  Aisle.GROCERY,
  Aisle.SPICES,
  Aisle.FROZEN,
  Aisle.BEVERAGES_SNACKS,
  Aisle.OTHER,
];

export const ALL_AISLES: Aisle[] = [...DEFAULT_AISLE_ORDER];

/**
 * Mapping from item category to the supermarket aisle the item is picked up in.
 * Categories not listed here fall back to `Aisle.OTHER`.
 */
const CATEGORY_TO_AISLE: Partial<Record<ItemCategory, Aisle>> = {
  [ItemCategory.VEGETABLES]: Aisle.PRODUCE,
  [ItemCategory.FRUITS]: Aisle.PRODUCE,

  [ItemCategory.MEAT]: Aisle.BUTCHER,
  [ItemCategory.FISH]: Aisle.BUTCHER,
  [ItemCategory.SEAFOOD]: Aisle.BUTCHER,

  [ItemCategory.DAIRY]: Aisle.DAIRY,

  [ItemCategory.GRAINS]: Aisle.GROCERY,
  [ItemCategory.CANNED]: Aisle.GROCERY,
  [ItemCategory.MEAL]: Aisle.GROCERY,
  [ItemCategory.PREPARATION]: Aisle.GROCERY,

  [ItemCategory.SPICES]: Aisle.SPICES,
  [ItemCategory.CONDIMENTS]: Aisle.SPICES,

  [ItemCategory.FROZEN]: Aisle.FROZEN,

  [ItemCategory.BEVERAGES]: Aisle.BEVERAGES_SNACKS,
  [ItemCategory.SNACKS]: Aisle.BEVERAGES_SNACKS,

  [ItemCategory.CLEANING_PRODUCTS]: Aisle.OTHER,
  [ItemCategory.OTHER]: Aisle.OTHER,
};

export const AISLE_ICONS: Record<Aisle, LucideIcon> = {
  [Aisle.PRODUCE]: Apple,
  [Aisle.BUTCHER]: Beef,
  [Aisle.DAIRY]: Milk,
  [Aisle.GROCERY]: ShoppingBasket,
  [Aisle.SPICES]: Flame,
  [Aisle.FROZEN]: Snowflake,
  [Aisle.BEVERAGES_SNACKS]: CupSoda,
  [Aisle.OTHER]: Sparkles,
};

/**
 * Resolve the aisle for a category value. Accepts the raw string stored on an
 * item so that unknown / legacy values fall back to `Aisle.OTHER` instead of
 * throwing.
 */
export const getAisleForCategory = (category?: string | null): Aisle => {
  if (!category) return Aisle.OTHER;
  const key = category as ItemCategory;
  return CATEGORY_TO_AISLE[key] ?? Aisle.OTHER;
};

export const getAisleIcon = (aisle: Aisle): LucideIcon => AISLE_ICONS[aisle];

/**
 * Translation key for the aisle display name. Lives under
 * `pages.shopping.aisles.*` in the locale files.
 */
export const getAisleTranslationKey = (aisle: Aisle): string => {
  switch (aisle) {
    case Aisle.BEVERAGES_SNACKS:
      return 'pages.shopping.aisles.beveragesSnacks';
    default:
      return `pages.shopping.aisles.${aisle}`;
  }
};

type HasItemCategory = {
  item?: { category?: string | null } | null;
};

const createEmptyGroups = <T,>(): Record<Aisle, T[]> => ({
  [Aisle.PRODUCE]: [],
  [Aisle.BUTCHER]: [],
  [Aisle.DAIRY]: [],
  [Aisle.GROCERY]: [],
  [Aisle.SPICES]: [],
  [Aisle.FROZEN]: [],
  [Aisle.BEVERAGES_SNACKS]: [],
  [Aisle.OTHER]: [],
});

/**
 * Group shopping list items by aisle. The returned record contains an entry
 * for every aisle; callers are responsible for filtering out empty aisles.
 */
export const groupItemsByAisle = <T extends HasItemCategory>(
  items: T[]
): Record<Aisle, T[]> => {
  const groups = createEmptyGroups<T>();
  for (const entry of items) {
    const aisle = getAisleForCategory(entry.item?.category);
    groups[aisle].push(entry);
  }
  return groups;
};

/**
 * Sanitize a stored aisle order array (e.g. coming from localStorage):
 * - drops unknown values
 * - de-duplicates
 * - appends any aisle that isn't present yet so new aisles show up for users
 *   who already saved a preference.
 */
export const sanitizeAisleOrder = (order: unknown): Aisle[] => {
  const known = new Set<Aisle>(ALL_AISLES);
  const seen = new Set<Aisle>();
  const result: Aisle[] = [];

  if (Array.isArray(order)) {
    for (const raw of order) {
      if (typeof raw !== 'string') continue;
      const candidate = raw as Aisle;
      if (known.has(candidate) && !seen.has(candidate)) {
        result.push(candidate);
        seen.add(candidate);
      }
    }
  }

  for (const aisle of DEFAULT_AISLE_ORDER) {
    if (!seen.has(aisle)) {
      result.push(aisle);
      seen.add(aisle);
    }
  }

  return result;
};
