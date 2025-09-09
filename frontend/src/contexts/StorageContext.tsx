import { createContext, useContext, useState, ReactNode } from 'react';

export interface StorageItem {
  id: string;
  itemId: string; // Reference to FoodItem
  storageAreaId: string;
  quantity: string;
  unit: string;
  purchaseDate: Date;
  expirationDate?: Date;
  location?: string; // shelf, drawer, etc.
  notes?: string;
}

export interface StorageArea {
  id: string;
  name: string;
  emoji: string;
  type: 'fridge' | 'freezer' | 'pantry' | 'other';
}

interface StorageContextType {
  storageItems: StorageItem[];
  storageAreas: StorageArea[];
  addStorageItem: (item: Omit<StorageItem, 'id'>) => StorageItem;
  updateStorageItem: (id: string, updates: Partial<StorageItem>) => void;
  removeStorageItem: (id: string) => void;
  getItemsByArea: (areaId: string) => StorageItem[];
  getStorageArea: (areaId: string) => StorageArea | undefined;
  addStorageArea: (area: Omit<StorageArea, 'id'>) => StorageArea;
  updateStorageArea: (id: string, updates: Partial<StorageArea>) => void;
  removeStorageArea: (id: string) => void;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

const initialStorageAreas: StorageArea[] = [
  { id: '1', name: 'Fridge', emoji: '🥬', type: 'fridge' },
  { id: '2', name: 'Freezer', emoji: '🧊', type: 'freezer' },
  { id: '3', name: 'Pantry', emoji: '🏺', type: 'pantry' },
];

const initialStorageItems: StorageItem[] = [
  {
    id: '1',
    itemId: '1', // Milk
    storageAreaId: '1',
    quantity: '1',
    unit: 'gallon',
    purchaseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    location: 'Main shelf'
  },
  {
    id: '2',
    itemId: '3', // Eggs
    storageAreaId: '1',
    quantity: '12',
    unit: 'count',
    purchaseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    expirationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    location: 'Door shelf'
  },
  {
    id: '3',
    itemId: '4', // Tomatoes
    storageAreaId: '1',
    quantity: '1',
    unit: 'lb',
    purchaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    location: 'Vegetable drawer'
  },
  {
    id: '4',
    itemId: '5', // Chicken breast
    storageAreaId: '2',
    quantity: '2',
    unit: 'lb',
    purchaseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    location: 'Main compartment'
  },
];

export const StorageProvider = ({ children }: { children: ReactNode }) => {
  const [storageItems, setStorageItems] = useState<StorageItem[]>(initialStorageItems);
  const [storageAreas, setStorageAreas] = useState<StorageArea[]>(initialStorageAreas);

  const addStorageItem = (item: Omit<StorageItem, 'id'>): StorageItem => {
    const newItem: StorageItem = {
      ...item,
      id: Date.now().toString(),
    };
    setStorageItems(prev => [...prev, newItem]);
    return newItem;
  };

  const updateStorageItem = (id: string, updates: Partial<StorageItem>) => {
    setStorageItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeStorageItem = (id: string) => {
    setStorageItems(prev => prev.filter(item => item.id !== id));
  };

  const getItemsByArea = (areaId: string): StorageItem[] => {
    return storageItems.filter(item => item.storageAreaId === areaId);
  };

  const getStorageArea = (areaId: string): StorageArea | undefined => {
    return storageAreas.find(area => area.id === areaId);
  };

  const addStorageArea = (area: Omit<StorageArea, 'id'>): StorageArea => {
    const newArea: StorageArea = {
      ...area,
      id: Date.now().toString(),
    };
    setStorageAreas(prev => [...prev, newArea]);
    return newArea;
  };

  const updateStorageArea = (id: string, updates: Partial<StorageArea>) => {
    setStorageAreas(prev => prev.map(area => 
      area.id === id ? { ...area, ...updates } : area
    ));
  };

  const removeStorageArea = (id: string) => {
    setStorageAreas(prev => prev.filter(area => area.id !== id));
    setStorageItems(prev => prev.filter(item => item.storageAreaId !== id));
  };

  return (
    <StorageContext.Provider value={{
      storageItems,
      storageAreas,
      addStorageItem,
      updateStorageItem,
      removeStorageItem,
      getItemsByArea,
      getStorageArea,
      addStorageArea,
      updateStorageArea,
      removeStorageArea
    }}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
