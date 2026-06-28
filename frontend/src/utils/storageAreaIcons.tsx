import {
  Archive,
  Boxes,
  Container,
  LucideIcon,
  LucideProps,
  Package,
  Refrigerator,
  Snowflake,
} from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { StorageAreaType } from '../types/enums';

/**
 * Mapping from StorageAreaType to a Lucide icon.
 *
 * Replaces the previous free-form emoji per storage area: the icon is now
 * derived from the area's `type` so every zone renders a consistent, themeable
 * (currentColor) glyph that matches the Fresh charter line/ink style.
 */
export const STORAGE_AREA_ICONS: Record<StorageAreaType, LucideIcon> = {
  [StorageAreaType.FRIDGE]: Refrigerator,
  [StorageAreaType.FREEZER]: Snowflake,
  [StorageAreaType.PANTRY]: Boxes,
  [StorageAreaType.KITCHEN_CUPBOARD]: Container,
  [StorageAreaType.OTHER]: Package,
};

export const FALLBACK_STORAGE_AREA_ICON: LucideIcon = Archive;

/**
 * Per-type icon tint. Colors map to the Fresh charter semantics
 * (info = fridge, purple = freezer) and stay legible in light & dark modes.
 */
export const STORAGE_AREA_ICON_COLORS: Record<StorageAreaType, string> = {
  [StorageAreaType.FRIDGE]: 'text-mf-green',
  [StorageAreaType.FREEZER]: 'text-mf-info',
  [StorageAreaType.PANTRY]: 'text-mf-brown',
  [StorageAreaType.KITCHEN_CUPBOARD]: 'text-mf-pink',
  [StorageAreaType.OTHER]: 'text-mf-text-soft',
};

export const FALLBACK_STORAGE_AREA_ICON_COLOR = 'text-mf-text-soft';

/**
 * Return the Lucide icon component for a storage-area type slug.
 * Falls back to a generic icon for unknown/missing values so no zone ever
 * renders without an icon.
 */
export const getStorageAreaIcon = (type?: string | null): LucideIcon => {
  if (!type) return FALLBACK_STORAGE_AREA_ICON;
  const key = type.toLowerCase() as StorageAreaType;
  return STORAGE_AREA_ICONS[key] ?? FALLBACK_STORAGE_AREA_ICON;
};

/** Tailwind text-color class for a storage-area type. */
export const getStorageAreaIconColor = (type?: string | null): string => {
  if (!type) return FALLBACK_STORAGE_AREA_ICON_COLOR;
  const key = type.toLowerCase() as StorageAreaType;
  return STORAGE_AREA_ICON_COLORS[key] ?? FALLBACK_STORAGE_AREA_ICON_COLOR;
};

export interface StorageAreaIconProps extends Omit<LucideProps, 'ref'> {
  type?: string | null;
  /** Set false to opt out of the per-type tint (inherits currentColor). */
  colored?: boolean;
}

/**
 * Convenience component that renders the right Lucide icon for a storage-area
 * type, tinted with its per-type color by default. Marked `aria-hidden` by
 * default since the area name is generally rendered next to it.
 *
 * The tint is applied first so a `text-*` class passed via `className` still
 * wins (tailwind-merge), letting callers override on specific surfaces.
 */
export const StorageAreaIcon = forwardRef<SVGSVGElement, StorageAreaIconProps>(
  ({ type, colored = true, className, 'aria-hidden': ariaHidden = true, ...props }, ref) => {
    const Icon = getStorageAreaIcon(type ?? undefined);
    return (
      <Icon
        ref={ref}
        aria-hidden={ariaHidden}
        className={cn(colored && getStorageAreaIconColor(type), className)}
        {...props}
      />
    );
  }
);

StorageAreaIcon.displayName = 'StorageAreaIcon';
