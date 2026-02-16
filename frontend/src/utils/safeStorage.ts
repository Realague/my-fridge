import { StateStorage } from 'zustand/middleware';

const createMemoryStorage = (): StateStorage => {
  const storage = new Map<string, string>();

  return {
    getItem: (name) => storage.get(name) ?? null,
    setItem: (name, value) => {
      storage.set(name, value);
    },
    removeItem: (name) => {
      storage.delete(name);
    },
  };
};

let memoryStorage: StateStorage | null = null;

export const getSafeStorage = (): StateStorage => {
  if (typeof window === 'undefined') {
    if (!memoryStorage) {
      memoryStorage = createMemoryStorage();
    }
    return memoryStorage;
  }

  try {
    const storage = window.localStorage;
    const testKey = '__myfridge_storage_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch (error) {
    if (!memoryStorage) {
      memoryStorage = createMemoryStorage();
    }
    return memoryStorage;
  }
};

