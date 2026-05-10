import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Boxes,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Package,
  ShoppingCart,
  SlidersHorizontal,
} from 'lucide-react';

export interface DesktopNavItem {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  to: string;
  matchPaths?: string[];
}

// Add new entries here when their tickets are delivered. The sidebar reads this
// list and renders only what's present — no "coming soon" placeholders.
export const DESKTOP_NAV_ITEMS: DesktopNavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'navigation.dashboard',
    icon: LayoutDashboard,
    to: '/dashboard',
  },
  {
    id: 'products',
    labelKey: 'navigation.products',
    icon: Package,
    to: '/products',
  },
  {
    id: 'recipes',
    labelKey: 'navigation.recipes',
    icon: BookOpen,
    to: '/recipes',
    matchPaths: ['/recipes', '/add-recipe', '/import-recipe'],
  },
  {
    id: 'meals',
    labelKey: 'navigation.mealPlan',
    icon: CalendarDays,
    to: '/meals',
    matchPaths: ['/meals'],
  },
  {
    id: 'shopping',
    labelKey: 'navigation.shoppingList',
    icon: ShoppingCart,
    to: '/shopping',
  },
  {
    id: 'item-minimums',
    labelKey: 'pages.more.features.itemMinimums.title',
    icon: SlidersHorizontal,
    to: '/item-minimums',
  },
  {
    id: 'loyalty-cards',
    labelKey: 'pages.more.features.loyaltyCards.title',
    icon: CreditCard,
    to: '/loyalty-cards',
  },
];

// The expandable "Storages" group is rendered separately because its children
// come from the household's storage areas (dynamic data).
export const STORAGE_GROUP = {
  id: 'storage',
  labelKey: 'navigation.storage',
  icon: Boxes,
  matchPaths: ['/storage', '/products'],
} as const;
