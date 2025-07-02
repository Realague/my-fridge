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
  const { selectedHouseholdId, households, fetchHouseholds } = useHouseholdStore();

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        // User not authenticated - redirect to auth
        navigate('/auth');
      } else if (!selectedHouseholdId) {
        // User authenticated but no household selected - check if they have any households
        fetchHouseholds().then(() => {
          if (households.length === 0) {
            // User has no households - redirect to onboarding
            navigate('/onboarding');
          }
          // If user has households but none selected, Dashboard will handle household selection
        });
      }
    }
  }, [authLoading, isAuthenticated, selectedHouseholdId, households.length, navigate, fetchHouseholds]);

  return {
    isAuthenticated,
    isLoading: authLoading,
    hasHousehold: !!selectedHouseholdId,
    selectedHouseholdId
  };
}; 