import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { StorageArea } from '@/types/household';
import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { getSafeStorage } from '@/utils/safeStorage';

export interface Household {
  id: string;
  name: string; 
  description?: string;
  inviteCode: string;
  memberCount: number;
  userRole: 'admin' | 'member';
  active: boolean;
  createdAt: string;
}

export interface HouseholdMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  HouseholdMember: {
    role: 'admin' | 'member';
    createdAt: string;
  }
}

export interface HouseholdDetails {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  memberCount: number;
  userRole: 'admin' | 'member';
  active: boolean;
  createdAt: string;
  members: HouseholdMember[];
}

interface HouseholdStore {
  // State
  households: Household[];
  householdDetails: Record<string, HouseholdDetails>;
  selectedHouseholdId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchHouseholds: () => Promise<void>;
  fetchHouseholdDetails: (householdId: string) => Promise<HouseholdDetails | null>;
  createHousehold: (name: string, description?: string, storageAreas?: StorageArea[]) => Promise<Household>;
  updateHousehold: (householdId: string, name: string, description?: string) => Promise<void>;
  selectHousehold: (householdId: string) => Promise<any>;
  joinHousehold: (inviteCode: string) => Promise<void>;
  leaveHousehold: (householdId: string) => Promise<void>;
  deleteHousehold: (householdId: string) => Promise<void>;
  removeMember: (householdId: string, memberId: string) => Promise<void>;
  
  // Internal actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedHouseholdId: (id: string | null) => void;
  
  // Computed getters
  getCurrentHousehold: () => Household | null;
  getCurrentHouseholdDetails: () => HouseholdDetails | null;
  isCurrentUserAdmin: () => boolean;
}

// Non-hook API service for use in stores
const createApiService = () => {
  const makeApiCall = async (url: string, options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: any; headers?: Record<string, string>; } = {}) => {
    const response = await makeAuthenticatedApiCall(url, options, {
      showToast: false // Let individual stores handle their own error messaging
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response;
  };

  return {
    get: (url: string, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'GET', headers }),
    post: (url: string, body?: any, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'POST', body, headers }),
    put: (url: string, body?: any, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'PUT', body, headers }),
    delete: (url: string, headers?: Record<string, string>) => 
      makeApiCall(url, { method: 'DELETE', headers }),
  };
};

const apiService = createApiService();

// Add initialization function to sync with auth store
export const syncHouseholdStoreWithAuth = () => {
  try {
    // Use dynamic import to avoid circular dependency
    import('./authStore').then(({ useAuthStore }) => {
      const user = useAuthStore.getState().user;
      if (user?.selectedHouseholdId) {
        useHouseholdStore.getState().setSelectedHouseholdId(user.selectedHouseholdId);
      }
      // `households` is never persisted across reloads (only selectedHouseholdId
      // is), and this is the one place that runs once for the whole app,
      // regardless of which route a reload lands on. Without this, components
      // like HouseholdSwitcher that read getCurrentHousehold() before any page
      // has called fetchHouseholds() itself see an empty list and fall back to
      // their "no household" placeholder until the user visits a page that
      // happens to fetch it.
      if (user) {
        void useHouseholdStore.getState().fetchHouseholds();
      }
    }).catch((error) => {
      console.error('Failed to import auth store for sync:', error);
    });
  } catch (error) {
    console.error('Failed to sync household store with auth store:', error);
  }
};

export const useHouseholdStore = create<HouseholdStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        households: [],
        householdDetails: {},
        selectedHouseholdId: null,
        loading: false,
        error: null,

        // Actions
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        setSelectedHouseholdId: (id) => set({ selectedHouseholdId: id }),

        fetchHouseholds: async () => {
          set({ loading: true, error: null });
          
          try {
            const response = await apiService.get('/api/households');
            const responseData = await response.json();
            set({ households: responseData.data || [] });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch households';
            set({ error: message });
            console.error('fetchHouseholds: Error:', error);
          } finally {
            set({ loading: false });
          }
        },

        fetchHouseholdDetails: async (householdId: string) => {
          set({ loading: true, error: null });
          
          try {
            const response = await apiService.get(`/api/households/${householdId}`);
            const responseData = await response.json();
            if (responseData.success && responseData.data) {
              const details = responseData.data;
              set(state => ({
                householdDetails: {
                  ...state.householdDetails,
                  [householdId]: details
                }
              }));
              return details;
            } else {
              throw new Error(responseData.message || 'Failed to fetch household details');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch household details';
            set({ error: message });
            console.error('fetchHouseholdDetails: Error:', error);
            return null;
          } finally {
            set({ loading: false });
          }
        },

        createHousehold: async (name: string, description?: string, storageAreas?: StorageArea[]) => {
          set({ loading: true, error: null });
          
          try {
            const requestBody: any = {
              name,
              description,
            };
            if (storageAreas && storageAreas.length > 0) {
              requestBody.storageAreas = storageAreas;
            }

            const response = await apiService.post('/api/households', requestBody);
            const responseData = await response.json();
            
            if (response.ok) {
              
              if (responseData.success) {
                // Update auth store with updated user data first
                if (responseData.data.user) {
                  try {
                    const authStoreModule = await import('./authStore');
                    authStoreModule.useAuthStore.getState().setUser(responseData.data.user);
                  } catch (error) {
                    console.warn('Failed to update auth store after household creation:', error);
                  }
                }
                
                // Update household store with new selected household
                if (responseData.data.household) {
                  set(state => ({ selectedHouseholdId: responseData.data.household.id }));
                }
                
                // Refresh the households list to include the new household
                const store = get();
                await store.fetchHouseholds();
                return responseData.data.household;
              } else {
                throw new Error(responseData.error || 'Failed to create household');
              }
            } else {
              throw new Error(responseData.error || 'Failed to create household');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create household';
            set({ error: message });
            console.error('createHousehold: Error:', error);
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        updateHousehold: async (householdId: string, name: string, description?: string) => {
          set({ loading: true, error: null });
          
          try {
            const response = await apiService.put(`/api/households/${householdId}`, {
              name,
              description
            });
            const responseData = await response.json();
            
            if (responseData.success) {
              // Refresh households and details
              const store = get();
              await store.fetchHouseholds();
              await store.fetchHouseholdDetails(householdId);
            } else {
              throw new Error(responseData.message || 'Failed to update household');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update household';
            set({ error: message });
            console.error('updateHousehold: Error:', error);
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        selectHousehold: async (householdId: string) => {
          set({ loading: true, error: null });
          
          try {
            const response = await apiService.put(`/api/households/${householdId}/select`);
            const responseData = await response.json();
            
            if (responseData.success) {
              // Update household store
              set({ selectedHouseholdId: householdId });
              
              // Also update auth store with the returned user data
              if (responseData.data && responseData.data.user) {
                try {
                  const authStoreModule = await import('./authStore');
                  authStoreModule.useAuthStore.getState().setUser(responseData.data.user);
                } catch (error) {
                  console.warn('Failed to update auth store after household selection:', error);
                }
              }
              
              return responseData.data;
            } else {
              throw new Error(responseData.message || 'Failed to select household');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to select household';
            set({ error: message });
            console.error('selectHousehold: Error:', error);
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        joinHousehold: async (inviteCode: string) => {
          set({ loading: true, error: null });
          
          try {
            const response = await apiService.post('/api/households/join', {
              inviteCode
            });
            const responseData = await response.json();
            
            if (response.ok) {
              
              if (responseData.success) {
                // Update auth store with updated user data first
                if (responseData.data.user) {
                  try {
                    const authStoreModule = await import('./authStore');
                    authStoreModule.useAuthStore.getState().setUser(responseData.data.user);
                  } catch (error) {
                    console.warn('Failed to update auth store after household join:', error);
                  }
                }
                
                // Update household store with new selected household
                if (responseData.data.household) {
                  set({ selectedHouseholdId: responseData.data.household.id });
                }
                
                // Refresh the households list to include the new household
                const store = get();
                await store.fetchHouseholds();
              } else {
                throw new Error(responseData.message || 'Failed to join household');
              }
            } else {
              throw new Error(responseData.message || 'Failed to join household');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to join household';
            set({ error: message });
            console.error('joinHousehold: Error:', error);
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        leaveHousehold: async (householdId: string) => {
          set({ loading: true, error: null });
          
          try {
            const response = await apiService.post(`/api/households/${householdId}/leave`);
            const responseData = await response.json();
            
            if (responseData.success) {
              // Remove from local state and refresh
              set(state => ({
                households: state.households.filter(h => h.id !== householdId),
                selectedHouseholdId: state.selectedHouseholdId === householdId ? state.households.length > 0 ? state.households[0].id : null : state.selectedHouseholdId
              }));
              
              // Clear details cache
              set(state => {
                const newDetails = { ...state.householdDetails };
                delete newDetails[householdId];
                return { householdDetails: newDetails };
              });
            } else {
              throw new Error(responseData.message || 'Failed to leave household');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to leave household';
            set({ error: message });
            console.error('leaveHousehold: Error:', error);
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        deleteHousehold: async (householdId: string) => {
          set({ loading: true, error: null });
          
          try {
            const response = await apiService.delete(`/api/households/${householdId}`);
            const responseData = await response.json();
            
            if (responseData.success) {
              // Remove from local state
              set(state => ({
                households: state.households.filter(h => h.id !== householdId),
                selectedHouseholdId: state.selectedHouseholdId === householdId ? state.households.length > 0 ? state.households[0].id : null : state.selectedHouseholdId
              }));
              
              // Clear details cache
              set(state => {
                const newDetails = { ...state.householdDetails };
                delete newDetails[householdId];
                return { householdDetails: newDetails };
              });
            } else {
              throw new Error(responseData.message || 'Failed to delete household');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete household';
            set({ error: message });
            console.error('deleteHousehold: Error:', error);
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        removeMember: async (householdId: string, memberId: string) => {
          set({ loading: true, error: null });
          
          try {
            const response = await apiService.delete(`/api/households/${householdId}/members/${memberId}`);
            const responseData = await response.json();
            
            if (responseData.success) {
              // Refresh household details to update member list
              const store = get();
              await store.fetchHouseholdDetails(householdId);
            } else {
              throw new Error(responseData.message || 'Failed to remove member');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove member';
            set({ error: message });
            console.error('removeMember: Error:', error);
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        // Computed getters
        getCurrentHousehold: () => {
          const state = get();
          if (!state.selectedHouseholdId) return null;
          return state.households.find(h => h.id === state.selectedHouseholdId) || null;
        },

        getCurrentHouseholdDetails: () => {
          const state = get();
          if (!state.selectedHouseholdId) return null;
          return state.householdDetails[state.selectedHouseholdId] || null;
        },

        isCurrentUserAdmin: () => {
          const state = get();
          if (!state.selectedHouseholdId) return false;
          const currentHousehold = state.households.find(h => h.id === state.selectedHouseholdId);
          return currentHousehold?.userRole === 'admin';
        },
      }),
      {
        name: 'household-store',
        storage: createJSONStorage(getSafeStorage),
        // Only persist non-sensitive data
        partialize: (state) => ({
          selectedHouseholdId: state.selectedHouseholdId,
        }),
      }
    ),
    { name: 'household-store' }
  )
); 