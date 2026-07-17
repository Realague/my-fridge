import { StorageAreaType } from '@/types/enums';

/**
 * Show X/Y congélation whenever the row is in a freezer zone or has a frozenDate.
 * Shared between MyProducts (MyProductsItemCard) and the storage-area detail view
 * so both cards render an identical freezer-progress section.
 */
export function getFreezerProgressDisplay(
  storageItem: {
    frozenDate?: string | null;
    daysFrozen?: number | null;
    recommendedFreezerDays?: number | null;
    createdAt: string;
  },
  areaType: StorageAreaType | undefined
): { current: number; total: number } | null {
  const total = storageItem.recommendedFreezerDays ?? 180;
  const inFreezer = areaType === StorageAreaType.FREEZER;
  const hasFrozenDate = Boolean(storageItem.frozenDate);
  if (!inFreezer && !hasFrozenDate) return null;

  let current = storageItem.daysFrozen;
  if (current == null || current === undefined) {
    if (hasFrozenDate && storageItem.frozenDate) {
      current = Math.max(
        0,
        Math.floor((Date.now() - new Date(storageItem.frozenDate).getTime()) / 86_400_000)
      );
    } else if (inFreezer) {
      current = Math.max(
        0,
        Math.floor((Date.now() - new Date(storageItem.createdAt).getTime()) / 86_400_000)
      );
    } else {
      current = 0;
    }
  }
  return { current, total };
}
