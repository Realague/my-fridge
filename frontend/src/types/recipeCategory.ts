export const RECIPE_CATEGORIES = [
  'vegetarian',
  'fish',
  'meat',
  'pasta',
  'dessert',
  'other',
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

const CATEGORY_SET: ReadonlySet<RecipeCategory> = new Set(RECIPE_CATEGORIES);

export function getRecipeCategory(tags: string[] | undefined): RecipeCategory | null {
  if (!tags) return null;
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (CATEGORY_SET.has(lower as RecipeCategory)) {
      return lower as RecipeCategory;
    }
  }
  return null;
}

/**
 * Pastels harmonisés issus de la charte (catégories d'aliments § 03).
 * `bg` est la teinte de fond, `dot` la pastille saturée.
 */
export const RECIPE_CATEGORY_PALETTE: Record<RecipeCategory, { bg: string; dot: string }> = {
  vegetarian: { bg: '#E6EFD8', dot: '#6FA040' },
  fish:       { bg: '#D7E5EC', dot: '#4E7A95' },
  meat:       { bg: '#F4D3CB', dot: '#B4452E' },
  pasta:      { bg: '#F2E6C1', dot: '#B89333' },
  dessert:    { bg: '#F1D5DD', dot: '#AE4E6C' },
  other:      { bg: '#EFE7D4', dot: '#7C8A82' },
};
