import { ItemCategory, Unit, CATALOG_BASE_STORAGE_UNITS } from '../types/enums';

/**
 * Maps Open Food Facts category tags (`categories_tags`, e.g. "en:plain-yogurts")
 * to My Fridge `ItemCategory` values, and derives a sensible default `Unit`.
 *
 * OFF uses a very granular hierarchical taxonomy; we match on substrings of the
 * language-prefixed tags (order matters — most specific first). This table is
 * intentionally maintained backend-side so it can be tuned without a client
 * release.
 */

// Ordered list of [substring, category]. First match wins, so the most
// specific / highest-signal keywords come first.
const CATEGORY_RULES: Array<[string, ItemCategory]> = [
  // Dairy & fresh
  ['yogurt', ItemCategory.DAIRY],
  ['yoghurt', ItemCategory.DAIRY],
  ['cheese', ItemCategory.DAIRY],
  ['milk', ItemCategory.DAIRY],
  ['cream', ItemCategory.DAIRY],
  ['butter', ItemCategory.DAIRY],
  ['dairy', ItemCategory.DAIRY],

  // Meat / fish / seafood
  ['seafood', ItemCategory.SEAFOOD],
  ['shellfish', ItemCategory.SEAFOOD],
  ['fish', ItemCategory.FISH],
  ['seafoods', ItemCategory.SEAFOOD],
  ['poultry', ItemCategory.MEAT],
  ['meat', ItemCategory.MEAT],
  ['charcuterie', ItemCategory.MEAT],
  ['hams', ItemCategory.MEAT],
  ['sausage', ItemCategory.MEAT],

  // Produce
  ['fresh-vegetable', ItemCategory.VEGETABLES],
  ['vegetable', ItemCategory.VEGETABLES],
  ['legume', ItemCategory.VEGETABLES],
  ['fresh-fruit', ItemCategory.FRUITS],
  ['fruit', ItemCategory.FRUITS],

  // Frozen (checked before beverages/snacks so "frozen-*" wins)
  ['frozen', ItemCategory.FROZEN],

  // Beverages & snacks
  ['water', ItemCategory.BEVERAGES],
  ['soda', ItemCategory.BEVERAGES],
  ['juice', ItemCategory.BEVERAGES],
  ['beverage', ItemCategory.BEVERAGES],
  ['drink', ItemCategory.BEVERAGES],
  ['wine', ItemCategory.BEVERAGES],
  ['beer', ItemCategory.BEVERAGES],
  ['coffee', ItemCategory.BEVERAGES],
  ['tea', ItemCategory.BEVERAGES],
  ['chip', ItemCategory.SNACKS],
  ['crisp', ItemCategory.SNACKS],
  ['biscuit', ItemCategory.SNACKS],
  ['cookie', ItemCategory.SNACKS],
  ['chocolate', ItemCategory.SNACKS],
  ['candy', ItemCategory.SNACKS],
  ['confectioner', ItemCategory.SNACKS],
  ['snack', ItemCategory.SNACKS],

  // Grocery / staples
  ['cereal', ItemCategory.GRAINS],
  ['pasta', ItemCategory.GRAINS],
  ['rice', ItemCategory.GRAINS],
  ['bread', ItemCategory.GRAINS],
  ['flour', ItemCategory.GRAINS],
  ['grain', ItemCategory.GRAINS],
  ['canned', ItemCategory.CANNED],
  ['tinned', ItemCategory.CANNED],
  ['sauce', ItemCategory.CONDIMENTS],
  ['condiment', ItemCategory.CONDIMENTS],
  ['spice', ItemCategory.SPICES],
  ['herb', ItemCategory.SPICES],
  ['prepared-meal', ItemCategory.MEAL],
  ['ready-meal', ItemCategory.MEAL],
  ['meal', ItemCategory.MEAL],
];

// Open Food Facts PNNS groups form a small, controlled vocabulary — far cleaner
// to map than the sprawling `categories_tags`. `pnns_groups_2` is the more
// specific of the two. Matched on lowercased substrings, most specific first.
const PNNS_RULES: Array<[string, ItemCategory]> = [
  // pnns_groups_2 (specific)
  ['dried fruits', ItemCategory.SNACKS],
  ['nuts', ItemCategory.SNACKS],
  ['fruits', ItemCategory.FRUITS],
  ['vegetables', ItemCategory.VEGETABLES],
  ['legumes', ItemCategory.VEGETABLES],
  ['potatoes', ItemCategory.GRAINS],
  ['soups', ItemCategory.MEAL],
  ['cheese', ItemCategory.DAIRY],
  ['dairy desserts', ItemCategory.DAIRY],
  ['milk', ItemCategory.DAIRY],
  ['processed meat', ItemCategory.MEAT],
  ['meat', ItemCategory.MEAT],
  ['poultry', ItemCategory.MEAT],
  ['offals', ItemCategory.MEAT],
  ['fish and seafood', ItemCategory.FISH],
  ['fish', ItemCategory.FISH],
  ['seafood', ItemCategory.SEAFOOD],
  ['breakfast cereals', ItemCategory.GRAINS],
  ['bread', ItemCategory.GRAINS],
  ['cereals', ItemCategory.GRAINS],
  ['pasta', ItemCategory.GRAINS],
  ['rice', ItemCategory.GRAINS],
  ['biscuits and cakes', ItemCategory.SNACKS],
  ['pastries', ItemCategory.SNACKS],
  ['chocolate', ItemCategory.SNACKS],
  ['sweets', ItemCategory.SNACKS],
  ['ice cream', ItemCategory.SNACKS],
  ['appetizers', ItemCategory.SNACKS],
  ['salty and fatty', ItemCategory.SNACKS],
  ['dressings and sauces', ItemCategory.CONDIMENTS],
  ['fats', ItemCategory.CONDIMENTS],
  ['waters', ItemCategory.BEVERAGES],
  ['juices', ItemCategory.BEVERAGES],
  ['beverages', ItemCategory.BEVERAGES],
  ['teas', ItemCategory.BEVERAGES],
  ['pizza', ItemCategory.MEAL],
  ['sandwiches', ItemCategory.MEAL],
  ['one-dish meals', ItemCategory.MEAL],
  // pnns_groups_1 (coarse)
  ['sugary snacks', ItemCategory.SNACKS],
  ['salty snacks', ItemCategory.SNACKS],
  ['milk and dairy', ItemCategory.DAIRY],
  ['fish meat eggs', ItemCategory.MEAT],
  ['fruits and vegetables', ItemCategory.VEGETABLES],
  ['cereals and potatoes', ItemCategory.GRAINS],
  ['composite foods', ItemCategory.MEAL],
  ['fat and sauces', ItemCategory.CONDIMENTS],
];

/**
 * Resolve an `ItemCategory` from OFF's PNNS groups (preferred: small controlled
 * vocabulary). Checks `pnns_groups_2` (specific) then `pnns_groups_1` (coarse).
 * Returns null when neither is usable, so the caller can fall back to
 * `categories_tags`.
 */
export function mapPnnsGroup(
  pnns2: string | undefined | null,
  pnns1: string | undefined | null
): ItemCategory | null {
  for (const value of [pnns2, pnns1]) {
    if (typeof value !== 'string' || !value.trim() || value.toLowerCase() === 'unknown') continue;
    const v = value.toLowerCase();
    for (const [needle, category] of PNNS_RULES) {
      if (v.includes(needle)) return category;
    }
  }
  return null;
}

/**
 * Resolve the best `ItemCategory` for a set of OFF category tags.
 * Falls back to `ItemCategory.OTHER` when nothing matches.
 */
export function mapOffCategory(categoriesTags: string[] | undefined | null): ItemCategory {
  if (!Array.isArray(categoriesTags) || categoriesTags.length === 0) {
    return ItemCategory.OTHER;
  }
  // OFF orders tags from least to most specific; scan the most specific first.
  const tags = [...categoriesTags].reverse().map((t) => t.toLowerCase());
  for (const tag of tags) {
    for (const [needle, category] of CATEGORY_RULES) {
      if (tag.includes(needle)) {
        return category;
      }
    }
  }
  return ItemCategory.OTHER;
}

/**
 * Parse an OFF `quantity` string (e.g. "1 L", "500 g", "6 x 125 g") into a
 * storage unit we support. Returns null when no supported unit can be inferred.
 */
export function parseOffUnit(quantity: string | undefined | null): Unit | null {
  if (!quantity) return null;
  const q = quantity.toLowerCase();
  // Match the unit token adjacent to the number. A leading `\d` (rather than a
  // `\b` word boundary) is required because OFF often has no space between the
  // number and the unit ("500g", "1L", "33cl"): between a digit and a letter
  // there is no `\b`, so `\bg\b` would never match "500g".
  // Order matters: check multi-char units before single-char ones.
  if (/\d\s*kg\b|kilogram/.test(q)) return Unit.KILOGRAM;
  if (/\d\s*cl\b|centilit/.test(q)) return Unit.CENTILITER;
  if (/\d\s*ml\b|millilit/.test(q)) return Unit.MILLILITER;
  if (/\d\s*l\b|litre|liter/.test(q)) return Unit.LITER;
  if (/\d\s*g\b|gram/.test(q)) return Unit.GRAM;
  return null;
}

/**
 * Default storage unit for a category when OFF's quantity gives no hint.
 */
export function defaultUnitForCategory(category: ItemCategory): Unit {
  switch (category) {
    case ItemCategory.BEVERAGES:
      return Unit.LITER;
    case ItemCategory.MEAT:
    case ItemCategory.FISH:
    case ItemCategory.SEAFOOD:
      return Unit.GRAM;
    default:
      return Unit.PIECE;
  }
}

/**
 * Combine the quantity hint and the category default into a suggested unit,
 * guaranteed to be a valid catalog storage unit.
 */
export function suggestUnit(quantity: string | undefined | null, category: ItemCategory): Unit {
  const parsed = parseOffUnit(quantity);
  const unit = parsed ?? defaultUnitForCategory(category);
  return CATALOG_BASE_STORAGE_UNITS.includes(unit) ? unit : Unit.PIECE;
}
