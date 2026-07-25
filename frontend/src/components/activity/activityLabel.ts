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
import { getTranslatedUnitLabel } from '@/utils/unitSystem';
import type { ActivityEntry } from '@/services/activityService';

export interface ActivityLabel {
  text: string; // libellé complet interpolé (i18n)
  target: string; // l'élément clé à mettre en emphase
  amount: string; // quantité + unité formatée (ex. '4 pièces') ; '' si non pertinent
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

// Le snapshot stocke le nom brut de l'Item : pour un article catalogue (seeded)
// c'est une clé i18n (« oliveOil »), pour un article perso c'est déjà le nom
// affichable. On tente `items.<nom>` et on retombe sur le nom brut si absente —
// même règle que getItemDisplayName, sans avoir besoin du householdId.
function displayItemName(raw: string | null | undefined, t: TFunction): string {
  const name = (raw ?? '').trim();
  if (!name) return t('activity.unknownItem');
  const key = `items.${name}`;
  const translated = t(key);
  return translated && translated !== key ? translated : name;
}

export function buildActivityLabel(entry: ActivityEntry, t: TFunction, isSelf = false): ActivityLabel {
  const meta = META[entry.action];
  const a = entry.action;
  const M = HouseholdActivityAction;
  // Accord du verbe : 2ᵉ personne quand l'acteur est l'utilisateur courant
  // (« Vous avez ajouté » et non « Vous a ajouté »). L'anglais ne change pas.
  const ns = isSelf ? 'labelsSelf' : 'labels';

  let target = '';
  let text = '';
  let amount = '';

  if (a === M.ITEM_ADDED || a === M.ITEM_CONSUMED || a === M.ITEM_THROWN || a === M.ITEM_REMOVED ||
      a === M.ITEM_QUANTITY_CHANGED || a === M.ITEM_EXPIRATION_CHANGED) {
    target = displayItemName(entry.itemNameSnapshot, t);
    text = t(`activity.${ns}.${a}`, {
      target,
      quantity: md<number>(entry, 'quantity') ?? '',
      unit: md<string>(entry, 'unit') ?? '',
      storageArea: md<string>(entry, 'storageAreaName') ?? '',
    });
    // Montant affiché à part (« 4 pièces », « 1 l ») : uniquement quand la
    // quantité est un nombre exploitable. L'unité est localisée + pluralisée.
    const q = md<number>(entry, 'quantity');
    if (typeof q === 'number' && Number.isFinite(q) && q > 0) {
      const unit = md<string>(entry, 'unit');
      amount = unit ? `${q} ${getTranslatedUnitLabel(unit, q, t)}` : `${q}`;
    }
  } else if (a === M.SHOPPING_ADDED || a === M.SHOPPING_CHECKED || a === M.SHOPPING_REMOVED) {
    target = displayItemName(entry.itemNameSnapshot, t);
    text = t(`activity.${ns}.${a}`, { target });
  } else {
    // recipe_*
    target = (md<string>(entry, 'recipeName')) || t('activity.unknownRecipe');
    text = t(`activity.${ns}.${a}`, {
      target,
      servings: md<number>(entry, 'servings') ?? '',
      oldServings: md<number>(entry, 'oldServings') ?? '',
      newServings: md<number>(entry, 'newServings') ?? '',
      count: md<number>(entry, 'deductedIngredientCount') ?? 0,
    });
  }

  return { text, target, amount, icon: meta.icon, tone: meta.tone };
}
