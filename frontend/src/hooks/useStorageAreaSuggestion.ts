import { useCallback, useEffect, useRef, useState } from 'react';
import { getSafeStorage } from '@/utils/safeStorage';
import type { StorageArea } from '@/services/storageAreaService';

/**
 * Per-user memory of which storage area the user last picked when adding an item,
 * both globally and per item category. Drives the smart suggestion in the global
 * "Mes produits" add-item flow:
 *
 *   1. If a category is chosen, look at areas whose `defaultCategories` include it.
 *      - exactly 1 match → that area
 *      - >1 matches      → last-used for this category, falling back to first match
 *      - 0 matches       → fall through
 *   2. Otherwise → last-used area overall, falling back to the first available area.
 *
 * Persisted in localStorage; missing/stale ids (deleted areas) are skipped.
 */
export interface AreaSuggestionMemory {
  lastUsedAreaId: string | null;
  lastUsedByCategory: Record<string, string>;
}

const DEFAULT_MEMORY: AreaSuggestionMemory = {
  lastUsedAreaId: null,
  lastUsedByCategory: {},
};

const STORAGE_KEY_PREFIX = 'mf-area-suggestion-v1-';

function readMemory(userId: string | undefined): AreaSuggestionMemory {
  if (!userId) return DEFAULT_MEMORY;
  const storage = getSafeStorage();
  const raw = storage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
  if (!raw) return DEFAULT_MEMORY;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_MEMORY;
    const lastUsedByCategory: Record<string, string> = {};
    if (parsed.lastUsedByCategory && typeof parsed.lastUsedByCategory === 'object') {
      for (const [category, areaId] of Object.entries(
        parsed.lastUsedByCategory as Record<string, unknown>
      )) {
        if (typeof areaId === 'string' && areaId.length > 0) {
          lastUsedByCategory[category] = areaId;
        }
      }
    }
    return {
      lastUsedAreaId:
        typeof parsed.lastUsedAreaId === 'string' && parsed.lastUsedAreaId.length > 0
          ? parsed.lastUsedAreaId
          : null,
      lastUsedByCategory,
    };
  } catch {
    return DEFAULT_MEMORY;
  }
}

function writeMemory(userId: string | undefined, memory: AreaSuggestionMemory) {
  if (!userId) return;
  const storage = getSafeStorage();
  try {
    storage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(memory));
  } catch (error) {
    console.warn('useStorageAreaSuggestion: failed to persist', error);
  }
}

export function suggestAreaId(
  category: string | null | undefined,
  storageAreas: StorageArea[],
  memory: AreaSuggestionMemory
): string | null {
  if (storageAreas.length === 0) return null;

  if (category) {
    const matching = storageAreas.filter((a) => a.defaultCategories?.includes(category));
    if (matching.length === 1) return matching[0].id;
    if (matching.length > 1) {
      const remembered = memory.lastUsedByCategory[category];
      if (remembered && matching.some((a) => a.id === remembered)) {
        return remembered;
      }
      return matching[0].id;
    }
  }

  if (
    memory.lastUsedAreaId &&
    storageAreas.some((a) => a.id === memory.lastUsedAreaId)
  ) {
    return memory.lastUsedAreaId;
  }

  return storageAreas[0].id;
}

export interface UseStorageAreaSuggestionReturn {
  memory: AreaSuggestionMemory;
  suggest: (
    category: string | null | undefined,
    storageAreas: StorageArea[]
  ) => string | null;
  recordUsage: (areaId: string, category: string | null | undefined) => void;
}

export function useStorageAreaSuggestion(
  userId: string | undefined
): UseStorageAreaSuggestionReturn {
  const [memory, setMemory] = useState<AreaSuggestionMemory>(() => readMemory(userId));

  const userIdRef = useRef(userId);
  useEffect(() => {
    if (userIdRef.current !== userId) {
      userIdRef.current = userId;
      setMemory(readMemory(userId));
    }
  }, [userId]);

  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    writeMemory(userId, memory);
  }, [userId, memory]);

  const suggest = useCallback(
    (category: string | null | undefined, storageAreas: StorageArea[]) =>
      suggestAreaId(category, storageAreas, memory),
    [memory]
  );

  const recordUsage = useCallback(
    (areaId: string, category: string | null | undefined) => {
      setMemory((prev) => {
        const nextByCategory = { ...prev.lastUsedByCategory };
        if (category) nextByCategory[category] = areaId;
        return {
          lastUsedAreaId: areaId,
          lastUsedByCategory: nextByCategory,
        };
      });
    },
    []
  );

  return { memory, suggest, recordUsage };
}
