import type { TFunction } from 'i18next';
import {
  Plus,
  Minus,
  Trash2,
  PackageMinus,
  Pencil,
  CalendarClock,
  ShoppingCart,
  Check,
  X,
  CalendarPlus,
  Utensils,
  CalendarX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HouseholdActivityAction } from '@/types/enums';
import type { ActivityEntry } from '@/services/activityService';

export interface ActivityLabel {
  text: string; // libellé complet interpolé (i18n)
  target: string; // l'élément clé à mettre en emphase
  icon: LucideIcon;
  tone: string; // classe de teinte Fresh (ex. 'text-mf-green')
}

const META: Record<HouseholdActivityAction, { icon: LucideIcon; tone: string }> = {
  [HouseholdActivityAction.ITEM_ADDED]: { icon: Plus, tone: 'text-mf-green' },
  [HouseholdActivityAction.ITEM_QUANTITY_CHANGED]: { icon: Pencil, tone: 'text-mf-text-mute' },
  [HouseholdActivityAction.ITEM_EXPIRATION_CHANGED]: { icon: CalendarClock, tone: 'text-mf-text-mute' },
  [HouseholdActivityAction.ITEM_CONSUMED]: { icon: Minus, tone: 'text-mf-green' },
  [HouseholdActivityAction.ITEM_THROWN]: { icon: Trash2, tone: 'text-mf-danger' },
  [HouseholdActivityAction.ITEM_REMOVED]: { icon: PackageMinus, tone: 'text-mf-text-mute' },
  [HouseholdActivityAction.SHOPPING_ADDED]: { icon: ShoppingCart, tone: 'text-mf-green' },
  [HouseholdActivityAction.SHOPPING_CHECKED]: { icon: Check, tone: 'text-mf-green' },
  [HouseholdActivityAction.SHOPPING_REMOVED]: { icon: X, tone: 'text-mf-text-mute' },
  [HouseholdActivityAction.RECIPE_PLANNED]: { icon: CalendarPlus, tone: 'text-mf-green' },
  [HouseholdActivityAction.RECIPE_SERVINGS_CHANGED]: { icon: Pencil, tone: 'text-mf-text-mute' },
  [HouseholdActivityAction.RECIPE_COOKED]: { icon: Utensils, tone: 'text-mf-green' },
  [HouseholdActivityAction.RECIPE_UNPLANNED]: { icon: CalendarX, tone: 'text-mf-text-mute' },
};

function md<T = unknown>(entry: ActivityEntry, key: string): T | undefined {
  return entry.metadata ? (entry.metadata[key] as T) : undefined;
}

export function buildActivityLabel(entry: ActivityEntry, t: TFunction): ActivityLabel {
  const meta = META[entry.action];
  const a = entry.action;
  const M = HouseholdActivityAction;

  let target = '';
  let text = '';

  if (a === M.ITEM_ADDED || a === M.ITEM_CONSUMED || a === M.ITEM_THROWN || a === M.ITEM_REMOVED ||
      a === M.ITEM_QUANTITY_CHANGED || a === M.ITEM_EXPIRATION_CHANGED) {
    target = entry.itemNameSnapshot || t('activity.unknownItem');
    text = t(`activity.labels.${a}`, {
      target,
      quantity: md<number>(entry, 'quantity') ?? '',
      unit: md<string>(entry, 'unit') ?? '',
      storageArea: md<string>(entry, 'storageAreaName') ?? '',
    });
  } else if (a === M.SHOPPING_ADDED || a === M.SHOPPING_CHECKED || a === M.SHOPPING_REMOVED) {
    target = entry.itemNameSnapshot || t('activity.unknownItem');
    text = t(`activity.labels.${a}`, { target });
  } else {
    // recipe_*
    target = (md<string>(entry, 'recipeName')) || t('activity.unknownRecipe');
    text = t(`activity.labels.${a}`, {
      target,
      servings: md<number>(entry, 'servings') ?? '',
      oldServings: md<number>(entry, 'oldServings') ?? '',
      newServings: md<number>(entry, 'newServings') ?? '',
      count: md<number>(entry, 'deductedIngredientCount') ?? 0,
    });
  }

  return { text, target, icon: meta.icon, tone: meta.tone };
}
