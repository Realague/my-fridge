import { itemService, ItemSuggestions } from '@/services/itemService';

const TTL_MS = 60_000;

interface Entry {
  at: number;
  promise: Promise<ItemSuggestions>;
}

const cache = new Map<string, Entry>();

export function getCachedSuggestions(householdId: string): Promise<ItemSuggestions> {
  const now = Date.now();
  const hit = cache.get(householdId);
  if (hit && now - hit.at < TTL_MS) {
    return hit.promise;
  }
  const entry: Entry = { at: now, promise: null as unknown as Promise<ItemSuggestions> };
  entry.promise = itemService.getItemSuggestions(householdId).catch((err) => {
    // Only evict if THIS entry is still the current one — a newer entry
    // (fresh call or invalidate) must not be dropped by our late failure.
    if (cache.get(householdId) === entry) {
      cache.delete(householdId);
    }
    throw err;
  });
  cache.set(householdId, entry);
  return entry.promise;
}

export function invalidateSuggestions(householdId?: string): void {
  if (householdId) cache.delete(householdId);
  else cache.clear();
}
