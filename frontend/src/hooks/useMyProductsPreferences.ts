import { useCallback, useEffect, useRef, useState } from 'react';
import { getSafeStorage } from '@/utils/safeStorage';
import type {
  StorageAreaSortCriterion,
  StorageAreaSortDirection,
} from '@/utils/storageAreaSort';

/**
 * Per-user preferences for the global "My products" view: sort criterion + direction
 * and the group-by-storage-area toggle. Persisted in localStorage independently from
 * the per-area preferences kept by useStorageAreaSortPreferences.
 */
export interface MyProductsPreferences {
  criterion: StorageAreaSortCriterion;
  direction: StorageAreaSortDirection;
  groupByArea: boolean;
}

export const DEFAULT_MY_PRODUCTS_PREFERENCES: MyProductsPreferences = {
  criterion: 'expiration',
  direction: 'asc',
  groupByArea: false,
};

const STORAGE_KEY_PREFIX = 'my-products-prefs-v1-';

const isCriterion = (value: unknown): value is StorageAreaSortCriterion =>
  value === 'expiration' || value === 'addedAt' || value === 'name' || value === 'category';

const isDirection = (value: unknown): value is StorageAreaSortDirection =>
  value === 'asc' || value === 'desc';

function readPreferences(userId: string | undefined): MyProductsPreferences {
  if (!userId) return DEFAULT_MY_PRODUCTS_PREFERENCES;

  const storage = getSafeStorage();
  const raw = storage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
  if (!raw) return DEFAULT_MY_PRODUCTS_PREFERENCES;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_MY_PRODUCTS_PREFERENCES;

    return {
      criterion: isCriterion(parsed.criterion)
        ? parsed.criterion
        : DEFAULT_MY_PRODUCTS_PREFERENCES.criterion,
      direction: isDirection(parsed.direction)
        ? parsed.direction
        : DEFAULT_MY_PRODUCTS_PREFERENCES.direction,
      groupByArea:
        typeof parsed.groupByArea === 'boolean'
          ? parsed.groupByArea
          : DEFAULT_MY_PRODUCTS_PREFERENCES.groupByArea,
    };
  } catch {
    return DEFAULT_MY_PRODUCTS_PREFERENCES;
  }
}

function writePreferences(userId: string | undefined, prefs: MyProductsPreferences) {
  if (!userId) return;
  const storage = getSafeStorage();
  try {
    storage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(prefs));
  } catch (error) {
    console.warn('useMyProductsPreferences: failed to persist', error);
  }
}

export interface UseMyProductsPreferencesReturn {
  preferences: MyProductsPreferences;
  setCriterion: (criterion: StorageAreaSortCriterion) => void;
  toggleDirection: () => void;
  setGroupByArea: (value: boolean) => void;
}

export function useMyProductsPreferences(
  userId: string | undefined
): UseMyProductsPreferencesReturn {
  const [preferences, setPreferences] = useState<MyProductsPreferences>(() =>
    readPreferences(userId)
  );

  const userIdRef = useRef(userId);
  useEffect(() => {
    if (userIdRef.current !== userId) {
      userIdRef.current = userId;
      setPreferences(readPreferences(userId));
    }
  }, [userId]);

  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    writePreferences(userId, preferences);
  }, [userId, preferences]);

  const setCriterion = useCallback((criterion: StorageAreaSortCriterion) => {
    setPreferences((prev) =>
      prev.criterion === criterion ? prev : { ...prev, criterion, direction: 'asc' }
    );
  }, []);

  const toggleDirection = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      direction: prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const setGroupByArea = useCallback((value: boolean) => {
    setPreferences((prev) => (prev.groupByArea === value ? prev : { ...prev, groupByArea: value }));
  }, []);

  return { preferences, setCriterion, toggleDirection, setGroupByArea };
}
