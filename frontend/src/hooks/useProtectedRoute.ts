import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useHouseholdStore } from '@/stores/householdStore';

/**
 * Hook to protect routes that require authentication and household membership
 * Redirects users to appropriate pages based on their auth and household status
 */
export const useProtectedRoute = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { selectedHouseholdId } = useHouseholdStore();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        // User not authenticated - redirect to auth
        navigate('/auth');
      } else if (!selectedHouseholdId) {
        // User authenticated but no household selected - redirect to onboarding to create first household
        navigate('/onboarding');
      }
    }
  }, [authLoading, isAuthenticated, selectedHouseholdId, navigate]);

  return {
    isAuthenticated,
    isLoading: authLoading,
    hasHousehold: !!selectedHouseholdId,
    selectedHouseholdId
  };
}; 