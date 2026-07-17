import { LucideIcon, PackageX, Trash2, Utensils } from 'lucide-react';
import { StockExitType } from '@/types/enums';

// Shared visual language for the three exit types across the journal
// (summary cards, filter tabs, entry rows). Mirrors the Sorties de stock charter:
// consumed = green (positive), wasted = red (waste), removed = neutral grey.
export interface ActionMeta {
  icon: LucideIcon;
  /** i18n key for the type label. */
  labelKey: string;
  /** Vertical accent liseré background class. */
  accentClass: string;
  /** Action pill background + text classes. */
  badgeClass: string;
  /** Icon tint class (on soft/neutral surfaces). */
  iconClass: string;
}

export const ACTION_META: Record<StockExitType, ActionMeta> = {
  [StockExitType.CONSUMED]: {
    icon: Utensils,
    labelKey: 'stockExit.journal.actions.consumed',
    accentClass: 'bg-mf-green',
    badgeClass: 'bg-mf-green-soft text-mf-green-deep',
    iconClass: 'text-mf-green-deep',
  },
  [StockExitType.WASTED]: {
    icon: Trash2,
    labelKey: 'stockExit.journal.actions.wasted',
    accentClass: 'bg-mf-danger',
    badgeClass: 'bg-mf-danger-soft text-mf-danger',
    iconClass: 'text-mf-danger',
  },
  [StockExitType.REMOVED]: {
    icon: PackageX,
    labelKey: 'stockExit.journal.actions.removed',
    accentClass: 'bg-mf-text-mute',
    badgeClass: 'bg-mf-night-elevated text-mf-text-soft',
    iconClass: 'text-mf-text-mute',
  },
};
