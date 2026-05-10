import { useCallback, useEffect, useState } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'mf-sidebar-collapsed-v1';
const STORAGE_GROUP_EXPANDED_KEY = 'mf-sidebar-storage-expanded-v1';

const readBoolean = (key: string, fallback: boolean): boolean => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === '1';
  } catch {
    return fallback;
  }
};

const writeBoolean = (key: string, value: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // localStorage unavailable — silently noop.
  }
};

export const useSidebarPreferences = () => {
  const [collapsed, setCollapsedState] = useState(false);
  const [storageExpanded, setStorageExpandedState] = useState(true);

  useEffect(() => {
    setCollapsedState(readBoolean(SIDEBAR_COLLAPSED_KEY, false));
    setStorageExpandedState(readBoolean(STORAGE_GROUP_EXPANDED_KEY, true));
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    writeBoolean(SIDEBAR_COLLAPSED_KEY, value);
  }, []);

  const setStorageExpanded = useCallback((value: boolean) => {
    setStorageExpandedState(value);
    writeBoolean(STORAGE_GROUP_EXPANDED_KEY, value);
  }, []);

  return {
    collapsed,
    setCollapsed,
    storageExpanded,
    setStorageExpanded,
  };
};
