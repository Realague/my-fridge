import React, { useEffect, useRef } from 'react';
import { syncHouseholdStoreWithAuth } from '@/stores/householdStore';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { initializeStoredItemStore } from '@/stores/storedItemStore';
import { initializeItemMinimumStore } from '@/stores/itemMinimumStore';

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const initialized = useRef(false);
  const api = useApiWithAuth();

  useEffect(() => {
    // Use a timeout to ensure Router context is fully established
    const timer = setTimeout(() => {
      if (!initialized.current) {
        try {
          // Sync household store with auth store
          syncHouseholdStoreWithAuth();
          
          // Initialize stored item store with API instance
          initializeStoredItemStore(api);
          
          // Initialize item minimum store with API instance
          initializeItemMinimumStore(api);
          
          initialized.current = true;
        } catch (error) {
          console.error('StoreProvider: Failed to sync stores:', error);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [api]);

  return <>{children}</>;
}; 