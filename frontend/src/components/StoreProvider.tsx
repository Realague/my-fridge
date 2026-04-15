import React, { useEffect } from 'react';
import { syncHouseholdStoreWithAuth } from '@/stores/householdStore';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { initializeItemMinimumStore } from '@/stores/itemMinimumStore';
import { initializeLoyaltyCardStore } from '@/stores/loyaltyCardStore';

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const api = useApiWithAuth();

  // Initialize during render so module-level `getApi()` is ready before any child
  // runs useEffect. (React runs child useEffects before parent useEffect, so
  // deferring init to useEffect + setTimeout caused loyalty/item fetches to no-op.)
  initializeItemMinimumStore(api);
  initializeLoyaltyCardStore(api);

  useEffect(() => {
    try {
      syncHouseholdStoreWithAuth();
    } catch (error) {
      console.error('StoreProvider: Failed to sync stores:', error);
    }
  }, []);

  return <>{children}</>;
}; 