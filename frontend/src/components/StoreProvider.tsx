import React, { useEffect, useRef } from 'react';
import { syncHouseholdStoreWithAuth } from '@/stores/householdStore';
// TODO: Update these stores to use non-hook API like householdStore and shoppingStore
// import { initializeStorageAreaStore } from '@/stores/storageAreaStore';
// import { initializeStoredItemStore } from '@/stores/storedItemStore';
// import { initializeItemService } from '@/services/itemService';
// import { initializeStoredItemService } from '@/services/storedItemService';

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const initialized = useRef(false);

  useEffect(() => {
    // Use a timeout to ensure Router context is fully established
    const timer = setTimeout(() => {
      if (!initialized.current) {
        try {
          
          // Sync household store with auth store
          // Note: Household store now uses direct fetch API, no initialization needed
          syncHouseholdStoreWithAuth();
          
          // TODO: Initialize other stores when they're updated to use non-hook API
          // initializeStorageAreaStore(api);
          // initializeShoppingStore(api);
          // initializeStoredItemStore(api);
          // initializeItemService(api);
          // initializeStoredItemService(api);
          
          initialized.current = true;
        } catch (error) {
          console.error('StoreProvider: Failed to sync stores:', error);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []); // Removed api dependency since household store doesn't need it anymore

  return <>{children}</>;
}; 