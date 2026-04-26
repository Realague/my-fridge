import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Aisle,
  DEFAULT_AISLE_ORDER,
  sanitizeAisleOrder,
} from '@/utils/aisleMapping';
import { getSafeStorage } from '@/utils/safeStorage';

export type ShoppingViewMode = 'aisle' | 'alpha';

export interface ShoppingPreferences {
  viewMode: ShoppingViewMode;
  aisleOrder: Aisle[];
  collapsedAisles: Aisle[];
}

const STORAGE_KEY = 'shopping-preferences-v1';

const DEFAULT_PREFERENCES: ShoppingPreferences = {
  viewMode: 'aisle',
  aisleOrder: DEFAULT_AISLE_ORDER,
  collapsedAisles: [],
};

const isViewMode = (value: unknown): value is ShoppingViewMode =>
  value === 'aisle' || value === 'alpha';

const sanitizeCollapsedAisles = (value: unknown): Aisle[] => {
  if (!Array.isArray(value)) return [];
  const known = new Set<Aisle>(DEFAULT_AISLE_ORDER);
  const seen = new Set<Aisle>();
  const result: Aisle[] = [];
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const candidate = raw as Aisle;
    if (known.has(candidate) && !seen.has(candidate)) {
      result.push(candidate);
      seen.add(candidate);
    }
  }
  return result;
};

const readPreferences = (): ShoppingPreferences => {
  const storage = getSafeStorage();
  const raw = storage.getItem(STORAGE_KEY);

  if (!raw) return DEFAULT_PREFERENCES;

  try {
    const parsed = JSON.parse(raw) as Partial<ShoppingPreferences>;
    return {
      viewMode: isViewMode(parsed.viewMode)
        ? parsed.viewMode
        : DEFAULT_PREFERENCES.viewMode,
      aisleOrder: sanitizeAisleOrder(parsed.aisleOrder),
      collapsedAisles: sanitizeCollapsedAisles(parsed.collapsedAisles),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

const writePreferences = (prefs: ShoppingPreferences) => {
  const storage = getSafeStorage();
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.warn('useShoppingPreferences: failed to persist preferences', error);
  }
};

export interface UseShoppingPreferencesReturn extends ShoppingPreferences {
  setViewMode: (mode: ShoppingViewMode) => void;
  setAisleOrder: (order: Aisle[]) => void;
  /**
   * Move the aisle identified by `activeId` to the position currently held by
   * `overId`. No-op when either id is missing or equal.
   */
  reorderAisle: (activeId: Aisle | string, overId: Aisle | string | null | undefined) => void;
  resetAisleOrder: () => void;
  isAisleCollapsed: (aisle: Aisle) => boolean;
  toggleAisleCollapsed: (aisle: Aisle) => void;
}

export const useShoppingPreferences = (): UseShoppingPreferencesReturn => {
  const [preferences, setPreferences] = useState<ShoppingPreferences>(
    () => readPreferences()
  );

  // Skip the initial write so we don't overwrite storage with the same value.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    writePreferences(preferences);
  }, [preferences]);

  const setViewMode = useCallback((mode: ShoppingViewMode) => {
    setPreferences((prev) =>
      prev.viewMode === mode ? prev : { ...prev, viewMode: mode }
    );
  }, []);

  const setAisleOrder = useCallback((order: Aisle[]) => {
    setPreferences((prev) => ({ ...prev, aisleOrder: sanitizeAisleOrder(order) }));
  }, []);

  const reorderAisle = useCallback<UseShoppingPreferencesReturn['reorderAisle']>(
    (activeId, overId) => {
      if (!overId || activeId === overId) return;
      setPreferences((prev) => {
        const fromIndex = prev.aisleOrder.indexOf(activeId as Aisle);
        const toIndex = prev.aisleOrder.indexOf(overId as Aisle);
        if (fromIndex === -1 || toIndex === -1) return prev;
        const next = [...prev.aisleOrder];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return { ...prev, aisleOrder: next };
      });
    },
    []
  );

  const resetAisleOrder = useCallback(() => {
    setPreferences((prev) => ({ ...prev, aisleOrder: [...DEFAULT_AISLE_ORDER] }));
  }, []);

  const isAisleCollapsed = useCallback(
    (aisle: Aisle) => preferences.collapsedAisles.includes(aisle),
    [preferences.collapsedAisles]
  );

  const toggleAisleCollapsed = useCallback((aisle: Aisle) => {
    setPreferences((prev) => {
      const collapsed = prev.collapsedAisles.includes(aisle)
        ? prev.collapsedAisles.filter((value) => value !== aisle)
        : [...prev.collapsedAisles, aisle];
      return { ...prev, collapsedAisles: collapsed };
    });
  }, []);

  return {
    viewMode: preferences.viewMode,
    aisleOrder: preferences.aisleOrder,
    collapsedAisles: preferences.collapsedAisles,
    setViewMode,
    setAisleOrder,
    reorderAisle,
    resetAisleOrder,
    isAisleCollapsed,
    toggleAisleCollapsed,
  };
};
