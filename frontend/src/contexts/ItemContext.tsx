import { createContext, useContext, ReactNode } from 'react';

export interface Item {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  availableUnits: string[];
  createdBy: string;
  householdId: string;
  createdAt: string;
  updatedAt: string;
}

interface ItemContextType {
  items: Item[];
  getItemById: (id: string) => Item | undefined;
}

const ItemContext = createContext<ItemContextType | undefined>(undefined);

export const ItemProvider = ({ children }: { children: ReactNode }) => {
  // This is a minimal implementation - in a real app this would fetch from an API
  const items: Item[] = [];
  
  const getItemById = (id: string): Item | undefined => {
    return items.find(item => item.id === id);
  };

  return (
    <ItemContext.Provider value={{ items, getItemById }}>
      {children}
    </ItemContext.Provider>
  );
};

export const useItems = () => {
  const context = useContext(ItemContext);
  if (context === undefined) {
    throw new Error('useItems must be used within an ItemProvider');
  }
  return context;
};
