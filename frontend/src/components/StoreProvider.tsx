import React, { useEffect } from 'react';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { initializeHouseholdStore, syncHouseholdStoreWithAuth } from '@/stores/householdStore';
import { initializeStorageAreaStore } from '@/stores/storageAreaStore';

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const api = useApiWithAuth();

  useEffect(() => {
    try {
      // Initialize stores with API instance
      initializeHouseholdStore(api);
      initializeStorageAreaStore(api);
      
      // Sync household store with auth store after initialization
      syncHouseholdStoreWithAuth();
    } catch (error) {
      console.error('StoreProvider: Failed to initialize stores:', error);
    }
  }, [api]);

  return <>{children}</>;
}; 