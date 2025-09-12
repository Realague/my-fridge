import React, { useEffect, useRef } from 'react';
import { syncHouseholdStoreWithAuth } from '@/stores/householdStore';

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
          // Note: Services now use direct fetch API, no initialization needed
          syncHouseholdStoreWithAuth();
          
          initialized.current = true;
        } catch (error) {
          console.error('StoreProvider: Failed to sync stores:', error);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
}; 