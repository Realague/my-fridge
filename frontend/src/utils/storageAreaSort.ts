import type { TFunction } from 'i18next';
import type { StoredItem } from '@/services/storedItemService';
import type { Item } from '@/services/itemService';
import { StorageAreaType } from '@/types/enums';
import { getItemDisplayName } from '@/utils/itemUtils';

export type StorageAreaSortCriterion = 'expiration' | 'addedAt' | 'name' | 'category';
export type StorageAreaSortDirection = 'asc' | 'desc';

export type StorageAreaListRow =
  | { kind: 'item'; storedItem: StoredItem }
  | { kind: 'header'; categoryKey: string | null };

const UNCATEGORIZED_SENTINEL = '__none__';

function collatorForLocale(locale: string): Intl.Collator {
  return new Intl.Collator(locale || 'en', { sensitivity: 'base' });
}

function displayName(
  storedItem: StoredItem,
  itemsById: Record<string, Item>,
  t: TFunction
): string {
  return getItemDisplayName(itemsById[storedItem.itemId], t);
}

function expirationTimestamp(storedItem: StoredItem): number | null {
  const raw = storedItem.effectiveExpirationDate || storedItem.expirationDate;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

function addedAtTimestamp(storedItem: StoredItem): number | null {
  const t = new Date(storedItem.createdAt).getTime();
  return Number.isNaN(t) ? null : t;
}

function compareNames(
  a: string,
  b: string,
  collator: Intl.Collator,
  direction: StorageAreaSortDirection
): number {
  const c = collator.compare(a, b);
  return direction === 'asc' ? c : -c;
}

/** Items missing catalog entry sort last; among themselves by name (empty) then id. */
function sortByNameLast(
  list: StoredItem[],
  itemsById: Record<string, Item>,
  t: TFunction,
  collator: Intl.Collator
): StoredItem[] {
  return [...list].sort((x, y) => {
    const nx = displayName(x, itemsById, t);
    const ny = displayName(y, itemsById, t);
    const c = collator.compare(nx, ny);
    if (c !== 0) return c;
    return x.itemId.localeCompare(y.itemId);
  });
}

function sortExpiration(
  list: StoredItem[],
  itemsById: Record<string, Item>,
  areaType: StorageAreaType,
  direction: StorageAreaSortDirection,
  locale: string,
  t: TFunction
): StoredItem[] {
  const collator = collatorForLocale(locale);
  if (areaType === StorageAreaType.FREEZER) {
    return sortByNameLast(list, itemsById, t, collator);
  }

  const dated: StoredItem[] = [];
  const undated: StoredItem[] = [];
  for (const si of list) {
    if (expirationTimestamp(si) != null) dated.push(si);
    else undated.push(si);
  }

  dated.sort((x, y) => {
    const tx = expirationTimestamp(x)!;
    const ty = expirationTimestamp(y)!;
    const cmp = tx - ty;
    if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    return compareNames(
      displayName(x, itemsById, t),
      displayName(y, itemsById, t),
      collator,
      'asc'
    );
  });

  const tail = sortByNameLast(undated, itemsById, t, collator);
  return [...dated, ...tail];
}

function sortAddedAt(
  list: StoredItem[],
  itemsById: Record<string, Item>,
  direction: StorageAreaSortDirection,
  locale: string,
  t: TFunction
): StoredItem[] {
  const collator = collatorForLocale(locale);
  const withTs: StoredItem[] = [];
  const without: StoredItem[] = [];
  for (const si of list) {
    if (addedAtTimestamp(si) != null) withTs.push(si);
    else without.push(si);
  }

  withTs.sort((x, y) => {
    const tx = addedAtTimestamp(x)!;
    const ty = addedAtTimestamp(y)!;
    const cmp = tx - ty;
    if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    return compareNames(
      displayName(x, itemsById, t),
      displayName(y, itemsById, t),
      collator,
      'asc'
    );
  });

  return [...withTs, ...sortByNameLast(without, itemsById, t, collator)];
}

function sortName(
  list: StoredItem[],
  itemsById: Record<string, Item>,
  direction: StorageAreaSortDirection,
  locale: string,
  t: TFunction
): StoredItem[] {
  const collator = collatorForLocale(locale);
  const withItem: StoredItem[] = [];
  const withoutItem: StoredItem[] = [];
  for (const si of list) {
    if (itemsById[si.itemId]) withItem.push(si);
    else withoutItem.push(si);
  }

  withItem.sort((x, y) =>
    compareNames(
      displayName(x, itemsById, t),
      displayName(y, itemsById, t),
      collator,
      direction
    )
  );

  withoutItem.sort((x, y) => {
    const c = x.itemId.localeCompare(y.itemId);
    return direction === 'asc' ? c : -c;
  });

  return [...withItem, ...withoutItem];
}

function categoryKeyForItem(storedItem: StoredItem, itemsById: Record<string, Item>): string | null {
  const item = itemsById[storedItem.itemId];
  const cat = item?.category;
  if (cat == null || String(cat).trim() === '') return null;
  return cat;
}

function translatedCategoryLabel(categoryKey: string | null, t: TFunction): string {
  if (categoryKey == null) return t('storageArea.sort.noCategory');
  return t(`items.categories.${categoryKey}`);
}

function sortCategory(
  list: StoredItem[],
  itemsById: Record<string, Item>,
  direction: StorageAreaSortDirection,
  locale: string,
  t: TFunction
): StorageAreaListRow[] {
  const collator = collatorForLocale(locale);
  const groups = new Map<string | typeof UNCATEGORIZED_SENTINEL, StoredItem[]>();

  for (const si of list) {
    const key = categoryKeyForItem(si, itemsById);
    const mapKey = key ?? UNCATEGORIZED_SENTINEL;
    const arr = groups.get(mapKey) ?? [];
    arr.push(si);
    groups.set(mapKey, arr);
  }

  const orderedKeys = [...groups.keys()].filter((k) => k !== UNCATEGORIZED_SENTINEL) as string[];
  orderedKeys.sort((a, b) =>
    compareNames(translatedCategoryLabel(a, t), translatedCategoryLabel(b, t), collator, direction)
  );

  const uncategorized = groups.get(UNCATEGORIZED_SENTINEL);
  /** Missing category is always last (no value for this criterion), regardless of asc/desc. */
  const keysInOrder =
    uncategorized && uncategorized.length > 0
      ? [...orderedKeys, UNCATEGORIZED_SENTINEL]
      : [...orderedKeys];

  const rows: StorageAreaListRow[] = [];
  for (const mapKey of keysInOrder) {
    const groupItems = groups.get(mapKey)!;
    groupItems.sort((x, y) =>
      compareNames(
        displayName(x, itemsById, t),
        displayName(y, itemsById, t),
        collator,
        'asc'
      )
    );

    const headerKey: string | null =
      mapKey === UNCATEGORIZED_SENTINEL ? null : (mapKey as string);
    rows.push({ kind: 'header', categoryKey: headerKey });
    for (const storedItem of groupItems) {
      rows.push({ kind: 'item', storedItem });
    }
  }

  return rows;
}

/**
 * Build ordered rows for the storage area list (flat items or category headers + items).
 */
export function buildStorageAreaDisplayRows(
  storedItems: StoredItem[],
  itemsById: Record<string, Item>,
  areaType: StorageAreaType,
  criterion: StorageAreaSortCriterion,
  direction: StorageAreaSortDirection,
  locale: string,
  t: TFunction
): StorageAreaListRow[] {
  if (criterion === 'category') {
    return sortCategory(storedItems, itemsById, direction, locale, t);
  }

  let sorted: StoredItem[];
  switch (criterion) {
    case 'expiration':
      sorted = sortExpiration(storedItems, itemsById, areaType, direction, locale, t);
      break;
    case 'addedAt':
      sorted = sortAddedAt(storedItems, itemsById, direction, locale, t);
      break;
    case 'name':
      sorted = sortName(storedItems, itemsById, direction, locale, t);
      break;
    default:
      sorted = [...storedItems];
  }

  return sorted.map((storedItem) => ({ kind: 'item' as const, storedItem }));
}
