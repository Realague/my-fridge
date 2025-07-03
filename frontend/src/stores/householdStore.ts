import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { toast } from 'sonner';
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

// Create API instance outside the store to avoid circular dependencies
let apiInstance: ReturnType<typeof useApiWithAuth> | null = null;

const getApi = () => {
  if (!apiInstance) {
    // This will be set by the provider
    throw new Error('API instance not initialized. Make sure to call initializeHouseholdStore.');
  }
  return apiInstance;
};

export const initializeHouseholdStore = (api: ReturnType<typeof useApiWithAuth>) => {
  apiInstance = api;
};

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
            const api = getApi();
            const response = await api.get('/api/households');
            
            if (response.ok) {
              const responseData = await response.json();
              set({ households: responseData.data || [] });
            } else {
              const errorText = await response.text();
              console.error('fetchHouseholds: Error response:', errorText);
              throw new Error(`Failed to fetch households: ${response.status}`);
            }
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
            const api = getApi();
            const response = await api.get(`/api/households/${householdId}`);
            
            if (response.ok) {
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
            } else {
              const errorText = await response.text();
              console.error('fetchHouseholdDetails: Error response:', errorText);
              throw new Error(`Failed to fetch household details: ${response.status}`);
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
            const api = getApi();
            const requestBody: any = {
              name,
              description,
            };

            // Add storage areas if provided
            if (storageAreas) {
              requestBody.storageAreas = storageAreas;
            }

            const response = await api.post('/api/households', requestBody);
            
            if (response.ok) {
              const responseData = await response.json();
              
              if (responseData.success) {
                const selectedCount = storageAreas ? Object.values(storageAreas).filter(Boolean).length : 0;
                const storageMessage = selectedCount > 0 ? ` with ${selectedCount} storage areas` : '';
                
                toast.success("Household Created!", {
                  description: `${name} has been created successfully${storageMessage}.`,
                });
                
                // Update household store with new selected household
                if (responseData.data.household) {
                  set({ selectedHouseholdId: responseData.data.household.id });
                }
                
                // Update auth store with updated user data
                if (responseData.data.user) {
                  try {
                    import('./authStore').then(({ useAuthStore }) => {
                      useAuthStore.getState().setUser(responseData.data.user);
                    }).catch((error) => {
                      console.warn('Failed to import auth store after household creation:', error);
                    });
                  } catch (error) {
                    console.warn('Failed to update auth store after household creation:', error);
                  }
                }
                
                // Refresh the households list
                const store = get();
                await store.fetchHouseholds();
                return responseData.data.household;
              } else {
                throw new Error(responseData.error || 'Failed to create household');
              }
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || `Failed to create household: ${response.status}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create household';
            set({ error: message });
            toast.error("Creation Failed", {
              description: message,
            });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        updateHousehold: async (householdId: string, name: string, description?: string) => {
          set({ loading: true, error: null });
          
          try {
            const api = getApi();
            const response = await api.put(`/api/households/${householdId}`, {
              name,
              description
            });
            
            if (response.ok) {
              const responseData = await response.json();
              
              if (responseData.success) {
                toast.success("Household Updated!", {
                  description: `${name} has been updated successfully.`,
                });
                
                // Refresh households and details
                const store = get();
                await store.fetchHouseholds();
                await store.fetchHouseholdDetails(householdId);
              } else {
                throw new Error(responseData.message || 'Failed to update household');
              }
            } else {
              const errorData = await response.json();
              throw new Error(errorData.message || `Failed to update household: ${response.status}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update household';
            set({ error: message });
            toast.error("Update Failed", {
              description: message,
            });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        selectHousehold: async (householdId: string) => {
          set({ loading: true, error: null });
          
          try {
            const api = getApi();
            const response = await api.put(`/api/households/${householdId}/select`);
            
            if (response.ok) {
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
                
                toast.success("Household Selected!", {
                  description: `You are now managing this household.`,
                });
                return responseData.data;
              } else {
                throw new Error(responseData.message || 'Failed to select household');
              }
            } else {
              const errorData = await response.json();
              throw new Error(errorData.message || `Failed to select household: ${response.status}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to select household';
            set({ error: message });
            toast.error("Selection Failed", {
              description: message,
            });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        joinHousehold: async (inviteCode: string) => {
          set({ loading: true, error: null });
          
          try {
            const api = getApi();
            const response = await api.post('/api/households/join', {
              inviteCode
            });
            
            if (response.ok) {
              const responseData = await response.json();
              
              if (responseData.success) {
                toast.success("Household Joined!", {
                  description: `You have successfully joined the household.`,
                });
                
                // Update household store with new selected household
                if (responseData.data.household) {
                  set({ selectedHouseholdId: responseData.data.household.id });
                }
                
                // Update auth store with updated user data
                if (responseData.data.user) {
                  try {
                    import('./authStore').then(({ useAuthStore }) => {
                      useAuthStore.getState().setUser(responseData.data.user);
                    }).catch((error) => {
                      console.warn('Failed to import auth store after household join:', error);
                    });
                  } catch (error) {
                    console.warn('Failed to update auth store after household join:', error);
                  }
                }
                
                // Refresh the households list
                const store = get();
                await store.fetchHouseholds();
              } else {
                throw new Error(responseData.message || 'Failed to join household');
              }
            } else {
              const errorData = await response.json();
              throw new Error(errorData.message || `Failed to join household: ${response.status}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to join household';
            set({ error: message });
            toast.error("Join Failed", {
              description: message,
            });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        leaveHousehold: async (householdId: string) => {
          set({ loading: true, error: null });
          
          try {
            const api = getApi();
            const response = await api.delete(`/api/households/${householdId}/leave`);
            
            if (response.ok) {
              const responseData = await response.json();
              
              if (responseData.success) {
                toast.success("Left Household", {
                  description: `You have successfully left the household.`,
                });
                
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
            } else {
              const errorData = await response.json();
              throw new Error(errorData.message || `Failed to leave household: ${response.status}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to leave household';
            set({ error: message });
            toast.error("Leave Failed", {
              description: message,
            });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        deleteHousehold: async (householdId: string) => {
          set({ loading: true, error: null });
          
          try {
            const api = getApi();
            const response = await api.delete(`/api/households/${householdId}`);
            
            if (response.ok) {
              const responseData = await response.json();
              
              if (responseData.success) {
                toast.success("Household Deleted", {
                  description: `The household has been permanently deleted.`,
                });
                
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
            } else {
              const errorData = await response.json();
              throw new Error(errorData.message || `Failed to delete household: ${response.status}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete household';
            set({ error: message });
            toast.error("Delete Failed", {
              description: message,
            });
            throw error;
          } finally {
            set({ loading: false });
          }
        },

        removeMember: async (householdId: string, memberId: string) => {
          set({ loading: true, error: null });
          
          try {
            const api = getApi();
            const response = await api.delete(`/api/households/${householdId}/members/${memberId}`);
            
            if (response.ok) {
              const responseData = await response.json();
              
              if (responseData.success) {
                toast.success("Member Removed", {
                  description: `The member has been removed from the household.`,
                });
                
                // Refresh household details to update member list
                const store = get();
                await store.fetchHouseholdDetails(householdId);
              } else {
                throw new Error(responseData.message || 'Failed to remove member');
              }
            } else {
              const errorData = await response.json();
              throw new Error(errorData.message || `Failed to remove member: ${response.status}`);
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove member';
            set({ error: message });
            toast.error("Remove Failed", {
              description: message,
            });
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