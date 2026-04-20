import {
  Apple,
  Archive,
  Beef,
  Carrot,
  ChefHat,
  Cookie,
  CupSoda,
  Flame,
  LucideIcon,
  LucideProps,
  Milk,
  Package,
  Snowflake,
  Soup,
  SprayCan,
  UtensilsCrossed,
  Wheat,
} from 'lucide-react';
import { forwardRef } from 'react';
import { ItemCategory } from '../types/enums';

/**
 * Mapping from ItemCategory to a Lucide icon.
 *
 * Icons are monochrome and filled-leaning to keep a consistent look at 16–24px
 * and to render correctly in both light and dark modes via `currentColor`.
 */
export const CATEGORY_ICONS: Record<ItemCategory, LucideIcon> = {
  [ItemCategory.VEGETABLES]: Carrot,
  [ItemCategory.FRUITS]: Apple,
  [ItemCategory.MEAT]: Beef,
  [ItemCategory.DAIRY]: Milk,
  [ItemCategory.GRAINS]: Wheat,
  [ItemCategory.SPICES]: Flame,
  [ItemCategory.BEVERAGES]: CupSoda,
  [ItemCategory.SNACKS]: Cookie,
  [ItemCategory.CONDIMENTS]: Soup,
  [ItemCategory.FROZEN]: Snowflake,
  [ItemCategory.CANNED]: Archive,
  [ItemCategory.MEAL]: UtensilsCrossed,
  [ItemCategory.PREPARATION]: ChefHat,
  [ItemCategory.CLEANING_PRODUCTS]: SprayCan,
  [ItemCategory.OTHER]: Package,
};

export const FALLBACK_CATEGORY_ICON: LucideIcon = Package;

/**
 * Return the Lucide icon component for a category slug.
 * Falls back to a generic Package icon for unknown/missing values so no item
 * ever renders without an icon.
 */
export const getCategoryIcon = (category?: string | null): LucideIcon => {
  if (!category) return FALLBACK_CATEGORY_ICON;
  const key = category.toLowerCase() as ItemCategory;
  return CATEGORY_ICONS[key] ?? FALLBACK_CATEGORY_ICON;
};

export interface CategoryIconProps extends Omit<LucideProps, 'ref'> {
  category?: string | null;
}

/**
 * Convenience component that renders the right Lucide icon for a given
 * category. Marked `aria-hidden` by default since the category label is
 * always rendered next to it.
 */
export const CategoryIcon = forwardRef<SVGSVGElement, CategoryIconProps>(
  ({ category, 'aria-hidden': ariaHidden = true, ...props }, ref) => {
    const Icon = getCategoryIcon(category ?? undefined);
    return <Icon ref={ref} aria-hidden={ariaHidden} {...props} />;
  }
);

CategoryIcon.displayName = 'CategoryIcon';
