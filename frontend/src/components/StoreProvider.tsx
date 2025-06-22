import React, { useEffect, useRef } from 'react';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { initializeHouseholdStore, syncHouseholdStoreWithAuth } from '@/stores/householdStore';
import { initializeStorageAreaStore } from '@/stores/storageAreaStore';
import { initializeShoppingStore } from '@/stores/shoppingStore';
import { initializeItemService } from '@/services/itemService';

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const api = useApiWithAuth();
  const initialized = useRef(false);

  useEffect(() => {
    // Use a timeout to ensure Router context is fully established
    const timer = setTimeout(() => {
      if (!initialized.current) {
        try {
          // Initialize stores with API instance
          initializeHouseholdStore(api);
          initializeStorageAreaStore(api);
          initializeShoppingStore(api);
          initializeItemService(api);
          
          // Sync household store with auth store after initialization
          syncHouseholdStoreWithAuth();
          
          initialized.current = true;
        } catch (error) {
          console.error('StoreProvider: Failed to initialize stores:', error);
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [api]);

  return <>{children}</>;
}; 