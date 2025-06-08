
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { getUnitsForCategory } from '@/utils/unitSystem';

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  availableUnits: string[];
  commonQuantities: string[];
  createdAt: Date;
  usageCount: number;
}

interface ItemContextType {
  items: FoodItem[];
  addItem: (name: string, category?: string, defaultUnit?: string, availableUnits?: string[]) => FoodItem;
  updateItem: (id: string, updates: Partial<FoodItem>) => void;
  updateItemUsage: (id: string) => void;
  searchItems: (query: string) => FoodItem[];
  getItemById: (id: string) => FoodItem | undefined;
}

const ItemContext = createContext<ItemContextType | undefined>(undefined);

// Updated pre-populated items with proper units from the unit system
const initialItems: FoodItem[] = [
  { 
    id: '1', 
    name: 'Milk', 
    category: 'Dairy', 
    defaultUnit: 'gallon',
    availableUnits: ['gallon', 'half gallon', 'quart', 'pint', 'cup', 'fl oz'],
    commonQuantities: ['1 gallon', '1/2 gallon', '1 quart'], 
    createdAt: new Date(), 
    usageCount: 5 
  },
  { 
    id: '2', 
    name: 'Bread', 
    category: 'Bakery', 
    defaultUnit: 'loaf',
    availableUnits: ['loaf', 'piece', 'dozen', 'package', 'bag'],
    commonQuantities: ['1 loaf', '2 loaves'], 
    createdAt: new Date(), 
    usageCount: 3 
  },
  { 
    id: '3', 
    name: 'Eggs', 
    category: 'Dairy', 
    defaultUnit: 'dozen',
    availableUnits: ['dozen', 'count', 'piece'],
    commonQuantities: ['12 count', '18 count', '6 count'], 
    createdAt: new Date(), 
    usageCount: 4 
  },
  { 
    id: '4', 
    name: 'Tomatoes', 
    category: 'Produce', 
    defaultUnit: 'lb',
    availableUnits: ['lb', 'oz', 'kg', 'g', 'piece', 'bunch', 'bag'],
    commonQuantities: ['1 lb', '2 lbs', '1 piece'], 
    createdAt: new Date(), 
    usageCount: 2 
  },
  { 
    id: '5', 
    name: 'Chicken breast', 
    category: 'Meat', 
    defaultUnit: 'lb',
    availableUnits: ['lb', 'oz', 'kg', 'g', 'piece', 'package'],
    commonQuantities: ['1 lb', '2 lbs', '1 piece'], 
    createdAt: new Date(), 
    usageCount: 3 
  },
  { 
    id: '6', 
    name: 'Bananas', 
    category: 'Produce', 
    defaultUnit: 'bunch',
    availableUnits: ['bunch', 'piece', 'lb', 'oz'],
    commonQuantities: ['1 bunch', '6 pieces'], 
    createdAt: new Date(), 
    usageCount: 2 
  },
  { 
    id: '7', 
    name: 'Rice', 
    category: 'Grains', 
    defaultUnit: 'lb',
    availableUnits: ['lb', 'oz', 'kg', 'g', 'cup', 'bag', 'box'],
    commonQuantities: ['1 lb', '2 lbs', '5 lbs'], 
    createdAt: new Date(), 
    usageCount: 1 
  },
];

export const ItemProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<FoodItem[]>(initialItems);

  const addItem = (name: string, category: string = 'Other', defaultUnit?: string, availableUnits?: string[]): FoodItem => {
    const categoryUnits = getUnitsForCategory(category);
    
    const newItem: FoodItem = {
      id: Date.now().toString(),
      name: name.trim(),
      category,
      defaultUnit: defaultUnit || categoryUnits.defaultUnit,
      availableUnits: availableUnits || categoryUnits.availableUnits,
      commonQuantities: ['1'],
      createdAt: new Date(),
      usageCount: 1
    };
    
    setItems(prev => [...prev, newItem]);
    return newItem;
  };

  const updateItem = (id: string, updates: Partial<FoodItem>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const updateItemUsage = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, usageCount: item.usageCount + 1 } : item
    ));
  };

  const searchItems = (query: string): FoodItem[] => {
    if (!query.trim()) return items.sort((a, b) => b.usageCount - a.usageCount);
    
    const lowercaseQuery = query.toLowerCase();
    return items
      .filter(item => item.name.toLowerCase().includes(lowercaseQuery))
      .sort((a, b) => {
        // Prioritize exact matches, then usage count
        const aExact = a.name.toLowerCase() === lowercaseQuery;
        const bExact = b.name.toLowerCase() === lowercaseQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return b.usageCount - a.usageCount;
      });
  };

  const getItemById = (id: string): FoodItem | undefined => {
    return items.find(item => item.id === id);
  };

  return (
    <ItemContext.Provider value={{
      items,
      addItem,
      updateItem,
      updateItemUsage,
      searchItems,
      getItemById
    }}>
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
