import type { StoredItem } from '@/services/storedItemService';
import type { Item } from '@/services/itemService';
import type { StorageArea } from '@/services/storageAreaService';
import { MyProductsItemCard } from '@/components/MyProductsItemCard';

interface StoredItemCardProps {
  storedItem: StoredItem;
  item: Item | undefined;
  area: StorageArea | undefined;
  currentUserId: string | undefined;
  /** When true, hide the storage-area badge chip (redundant inside a single area). */
  hideAreaBadge?: boolean;
}

/**
 * Shared card for a stored item, used by both "Mes produits" and the storage-area
 * detail page. Display-only — editing a stored product is intentionally not offered;
 * removals go through the stock-exit actions. The card body never navigates.
 */
export function StoredItemCard({
  storedItem,
  item,
  area,
  currentUserId,
  hideAreaBadge,
}: StoredItemCardProps) {
  return (
    <MyProductsItemCard
      storedItem={storedItem}
      item={item}
      area={area}
      currentUserId={currentUserId}
      disableNavigate
      hideAreaBadge={hideAreaBadge}
    />
  );
}
