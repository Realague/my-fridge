import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { StorageAreaSelections } from '@/types/household';

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
  createHousehold: (name: string, description?: string, storageAreas?: StorageAreaSelections) => Promise<Household>;
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

// Create API service for non-hook usage in stores
const createApiService = () => {
  const makeApiCall = async (url: string, options: RequestInit = {}) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    const token = localStorage.getItem('google_token');
    if (!token) {
      throw new Error('No authentication token');
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    };

    const response = await fetch(fullUrl, requestOptions);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return response;
  };

  return {
    get: (url: string) => makeApiCall(url, { method: 'GET' }),
    post: (url: string, body?: any) => makeApiCall(url, { method: 'POST', body: JSON.stringify(body) }),
    put: (url: string, body?: any) => makeApiCall(url, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (url: string) => makeApiCall(url, { method: 'DELETE' }),
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
        console.log('Household store synced with auth store:', user.selectedHouseholdId);
      }
    }).catch((error) => {
      console.log('Failed to import auth store for sync:', error);
    });
  } catch (error) {
    console.log('Failed to sync household store with auth store:', error);
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

        createHousehold: async (name: string, description?: string, storageAreas?: StorageAreaSelections) => {
          set({ loading: true, error: null });
          
          try {
            const requestBody: any = {
              name,
              description,
            };

            // Add storage areas if provided
            if (storageAreas) {
              requestBody.storageAreas = storageAreas;
            }

            const response = await apiService.post('/api/households', requestBody);
            const responseData = await response.json();
            
            if (responseData.success) {
              // Refresh the households list
              const store = get();
              await store.fetchHouseholds();
              return responseData.data;
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
                  import('./authStore').then(({ useAuthStore }) => {
                    useAuthStore.getState().setUser(responseData.data.user);
                  }).catch((error) => {
                    console.warn('Failed to import auth store after household selection:', error);
                  });
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
            
            if (responseData.success) {
              // Refresh the households list
              const store = get();
              await store.fetchHouseholds();
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
            const response = await apiService.delete(`/api/households/${householdId}/leave`);
            const responseData = await response.json();
            
            if (responseData.success) {
              // Remove from local state and refresh
              set(state => ({
                households: state.households.filter(h => h.id !== householdId),
                selectedHouseholdId: state.selectedHouseholdId === householdId ? null : state.selectedHouseholdId
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
                selectedHouseholdId: state.selectedHouseholdId === householdId ? null : state.selectedHouseholdId
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
        // Only persist non-sensitive data
        partialize: (state) => ({
          selectedHouseholdId: state.selectedHouseholdId,
        }),
      }
    ),
    { name: 'household-store' }
  )
); 