import { useCallback, useEffect, useRef, useState } from 'react';
import { getSafeStorage } from '@/utils/safeStorage';
import type { StorageAreaSortCriterion, StorageAreaSortDirection } from '@/utils/storageAreaSort';

export interface StorageAreaSortState {
  criterion: StorageAreaSortCriterion;
  direction: StorageAreaSortDirection;
}

export const DEFAULT_STORAGE_AREA_SORT: StorageAreaSortState = {
  criterion: 'expiration',
  direction: 'asc',
};

const STORAGE_KEY_PREFIX = 'storage-area-sort-v1-';

const isCriterion = (value: unknown): value is StorageAreaSortCriterion =>
  value === 'expiration' || value === 'addedAt' || value === 'name' || value === 'category';

const isDirection = (value: unknown): value is StorageAreaSortDirection =>
  value === 'asc' || value === 'desc';

function readPreferences(userId: string | undefined): Record<string, StorageAreaSortState> {
  if (!userId) return {};

  const storage = getSafeStorage();
  const raw = storage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};

    const result: Record<string, StorageAreaSortState> = {};
    for (const [areaId, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Record<string, unknown>;
      if (!isCriterion(v.criterion) || !isDirection(v.direction)) continue;
      result[areaId] = { criterion: v.criterion, direction: v.direction };
    }
    return result;
  } catch {
    return {};
  }
}

function writePreferences(userId: string | undefined, prefs: Record<string, StorageAreaSortState>) {
  if (!userId) return;
  const storage = getSafeStorage();
  try {
    storage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(prefs));
  } catch (error) {
    console.warn('useStorageAreaSortPreferences: failed to persist', error);
  }
}

export interface UseStorageAreaSortPreferencesReturn {
  getSort: (storageAreaId: string) => StorageAreaSortState;
  setCriterion: (storageAreaId: string, criterion: StorageAreaSortCriterion) => void;
  toggleDirection: (storageAreaId: string) => void;
}

export function useStorageAreaSortPreferences(
  userId: string | undefined
): UseStorageAreaSortPreferencesReturn {
  const [byArea, setByArea] = useState<Record<string, StorageAreaSortState>>(() =>
    readPreferences(userId)
  );

  const userIdRef = useRef(userId);
  useEffect(() => {
    if (userIdRef.current !== userId) {
      userIdRef.current = userId;
      setByArea(readPreferences(userId));
    }
  }, [userId]);

  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    writePreferences(userId, byArea);
  }, [userId, byArea]);

  const getSort = useCallback(
    (storageAreaId: string): StorageAreaSortState =>
      byArea[storageAreaId] ?? DEFAULT_STORAGE_AREA_SORT,
    [byArea]
  );

  const setCriterion = useCallback(
    (storageAreaId: string, criterion: StorageAreaSortCriterion) => {
      setByArea((prev) => {
        const current = prev[storageAreaId] ?? DEFAULT_STORAGE_AREA_SORT;
        if (current.criterion === criterion) {
          return prev;
        }
        return {
          ...prev,
          [storageAreaId]: { criterion, direction: 'asc' },
        };
      });
    },
    []
  );

  const toggleDirection = useCallback((storageAreaId: string) => {
    setByArea((prev) => {
      const current = prev[storageAreaId] ?? DEFAULT_STORAGE_AREA_SORT;
      const nextDir: StorageAreaSortDirection = current.direction === 'asc' ? 'desc' : 'asc';
      return {
        ...prev,
        [storageAreaId]: { ...current, direction: nextDir },
      };
    });
  }, []);

  return { getSort, setCriterion, toggleDirection };
}
