import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Calendar,
  CreditCard,
  Home,
  LogOut,
  Sliders,
  SlidersHorizontal,
  User,
} from 'lucide-react';

export type MoreFeatureAction = 'signOut';

export interface MoreFeature {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  to?: string;
  action?: MoreFeatureAction;
}

export interface MoreSection {
  id: string;
  titleKey: string;
  features: MoreFeature[];
}

// To expose a new secondary feature on the mobile More page, add an entry to
// the matching section below. Sections with zero features are hidden, so future
// features can be added in their planned section without restructuring.
export const MORE_SECTIONS: MoreSection[] = [
  {
    id: 'cooking',
    titleKey: 'pages.more.sections.cooking',
    features: [
      {
        id: 'meals',
        titleKey: 'pages.more.features.meals.title',
        descriptionKey: 'pages.more.features.meals.description',
        icon: Calendar,
        to: '/meals',
      },
    ],
  },
  {
    id: 'stock',
    titleKey: 'pages.more.sections.stock',
    features: [
      {
        id: 'item-minimums',
        titleKey: 'pages.more.features.itemMinimums.title',
        descriptionKey: 'pages.more.features.itemMinimums.description',
        icon: SlidersHorizontal,
        to: '/item-minimums',
      },
    ],
  },
  {
    id: 'shopping',
    titleKey: 'pages.more.sections.shopping',
    features: [
      {
        id: 'loyalty-cards',
        titleKey: 'pages.more.features.loyaltyCards.title',
        descriptionKey: 'pages.more.features.loyaltyCards.description',
        icon: CreditCard,
        to: '/loyalty-cards',
      },
    ],
  },
  {
    id: 'account',
    titleKey: 'pages.more.sections.account',
    features: [
      {
        id: 'profile',
        titleKey: 'pages.more.features.profile.title',
        descriptionKey: 'pages.more.features.profile.description',
        icon: User,
        to: '/settings?tab=profile',
      },
      {
        id: 'household',
        titleKey: 'pages.more.features.household.title',
        descriptionKey: 'pages.more.features.household.description',
        icon: Home,
        to: '/household',
      },
      {
        id: 'notifications',
        titleKey: 'pages.more.features.notifications.title',
        descriptionKey: 'pages.more.features.notifications.description',
        icon: Bell,
        to: '/settings?tab=notifications',
      },
      {
        id: 'preferences',
        titleKey: 'pages.more.features.preferences.title',
        descriptionKey: 'pages.more.features.preferences.description',
        icon: Sliders,
        to: '/settings?tab=appearance',
      },
      {
        id: 'sign-out',
        titleKey: 'pages.more.features.signOut.title',
        descriptionKey: 'pages.more.features.signOut.description',
        icon: LogOut,
        action: 'signOut',
      },
    ],
  },
];
