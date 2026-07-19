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
  const promise = itemService.getItemSuggestions(householdId).catch((err) => {
    // Don't cache failures — drop the entry so the next open retries.
    cache.delete(householdId);
    throw err;
  });
  cache.set(householdId, { at: now, promise });
  return promise;
}

export function invalidateSuggestions(householdId?: string): void {
  if (householdId) cache.delete(householdId);
  else cache.clear();
}
