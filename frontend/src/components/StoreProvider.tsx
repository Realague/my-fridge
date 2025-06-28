import React, { useEffect, useRef } from 'react';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { initializeHouseholdStore, syncHouseholdStoreWithAuth } from '@/stores/householdStore';
import { initializeStorageAreaStore } from '@/stores/storageAreaStore';
import { initializeShoppingStore } from '@/stores/shoppingStore';
import { initializeStoredItemStore } from '@/stores/storedItemStore';
import { initializeItemService } from '@/services/itemService';
import { initializeStoredItemService } from '@/services/storedItemService';

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const api = useApiWithAuth();
  const initialized = useRef(false);

  useEffect(() => {
    // Use a timeout to ensure Router context is fully established
    const timer = setTimeout(() => {
      if (!initialized.current && api) {
        try {
          console.log('StoreProvider: Initializing stores...');
          
          // Initialize stores with API instance
          initializeHouseholdStore(api);
          initializeStorageAreaStore(api);
          initializeShoppingStore(api);
          initializeStoredItemStore(api);
          initializeItemService(api);
          initializeStoredItemService(api);
          
          // Sync household store with auth store after initialization
          syncHouseholdStoreWithAuth();
          
          initialized.current = true;
          console.log('StoreProvider: All stores initialized successfully');
        } catch (error) {
          console.error('StoreProvider: Failed to initialize stores:', error);
        }
      }
    }, 100); // Increased timeout to give more time for context setup

    return () => clearTimeout(timer);
  }, [api]);

  return <>{children}</>;
}; 