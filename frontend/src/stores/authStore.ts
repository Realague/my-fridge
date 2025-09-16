
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getUnauthHeaders, getAuthHeaders } from '@/utils/apiHeaders';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  selectedHouseholdId: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  signInWithGoogle: () => void;
  signOut: () => void;
  refreshToken: () => Promise<boolean>;
  checkTokenExpiry: () => boolean;
  verifyTokenWithBackend: (token: string) => Promise<void>;
  updateUser: (firstName: string, lastName: string) => Promise<void>;
  initializeGoogleAuth: () => void;
  checkStoredAuth: () => Promise<void>;
  isTokenExpired: (token: string) => boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => {
        set({ user });
        // Sync with household store when user changes
        if (user?.selectedHouseholdId) {
          try {
            import('./householdStore').then(({ useHouseholdStore }) => {
              useHouseholdStore.getState().setSelectedHouseholdId(user.selectedHouseholdId);
            }).catch((error) => {
              console.error('Failed to import household store for sync:', error);
            });
          } catch (error) {
            // Store might not be initialized yet, ignore error
            console.error('Household store not ready for sync');
          }
        } else if (user && !user.selectedHouseholdId) {
          // Clear household selection if user doesn't have one
          try {
            import('./householdStore').then(({ useHouseholdStore }) => {
              useHouseholdStore.getState().setSelectedHouseholdId(null);
            }).catch((error) => {
              console.error('Failed to import household store for clearing selection:', error);
            });
          } catch (error) {
            console.error('Household store not ready for clearing selection');
          }
        }
      },
      setLoading: (loading) => set({ isLoading: loading }),
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),

      initializeGoogleAuth: () => {
        const loadGoogleSDK = () => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
              try {
                const handleGoogleResponseLocal = async (response: any) => {
                  try {
                    const token = response.credential;
                    localStorage.setItem('google_token', token);
                    await get().verifyTokenWithBackend(token);
                  } catch (error) {
                    console.error('Google auth failed:', error);
                  }
                };

                window.google.accounts.id.initialize({
                  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                  callback: handleGoogleResponseLocal,
                  auto_select: false,
                  cancel_on_tap_outside: false,
                });
                
                // Check if user is already authenticated - this will set isLoading to false
                get().checkStoredAuth();
              } catch (error) {
                console.error('Error initializing Google Auth:', error);
                set({ isLoading: false });
              }
            } else {
              console.error('Google SDK not available or Client ID missing');
              if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
                console.error('VITE_GOOGLE_CLIENT_ID environment variable is not set');
              }
              set({ isLoading: false });
            }
          };
          script.onerror = () => {
            console.error('Failed to load Google SDK');
            set({ isLoading: false });
          };
          document.head.appendChild(script);
        };

        loadGoogleSDK();
      },

      verifyTokenWithBackend: async (token: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'localhost:3000'}/auth/verify-google-token`, {
          method: 'POST',
          headers: getUnauthHeaders(),
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          const responseData = await response.json();
          set({ 
            user: responseData.data.user,
            isAuthenticated: true 
          });
        } else {
          console.error('Backend token verification failed:', response.status);
          throw new Error('Token verification failed');
        }
      },

      checkStoredAuth: async () => {
        const token = localStorage.getItem('google_token');
        if (token) {
          try {
            // Check if token is expired before trying to use it
            if (get().isTokenExpired(token)) {
              const refreshed = await get().refreshToken();
              if (!refreshed) {
                localStorage.removeItem('google_token');
                set({ user: null, isAuthenticated: false });
              }
            } else {
              await get().verifyTokenWithBackend(token);
            }
          } catch (error) {
            console.error('Stored token verification failed:', error);
            localStorage.removeItem('google_token');
            set({ user: null, isAuthenticated: false });
          }
        } else {
          // No token found, ensure auth state is clear
          set({ user: null, isAuthenticated: false });
        }
        // Always set loading to false after checking stored auth
        set({ isLoading: false });
      },

      isTokenExpired: (token: string): boolean => {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          return payload.exp < currentTime;
        } catch (error) {
          console.error('Error parsing token:', error);
          return true;
        }
      },

      checkTokenExpiry: (): boolean => {
        const token = localStorage.getItem('google_token');
        if (!token) return true;
        return get().isTokenExpired(token);
      },

      refreshToken: async (): Promise<boolean> => {
        try {
          return new Promise((resolve) => {
            if (window.google) {
              window.google.accounts.id.prompt((notification: any) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                  resolve(false);
                }
              });
              
              setTimeout(() => {
                resolve(false);
              }, 10000);
            } else {
              resolve(false);
            }
          });
        } catch (error) {
          console.error('Token refresh failed:', error);
          return false;
        }
      },

      signInWithGoogle: () => {
        if (window.google) {
          window.google.accounts.id.prompt();
        }
      },

      updateUser: async (firstName: string, lastName: string) => {
        const token = localStorage.getItem('google_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'localhost:3000'}/auth/me`, {
          method: 'PUT',
          headers: getAuthHeaders(token),
          body: JSON.stringify({ firstName, lastName }),
        });

        if (response.ok) {
          const responseData = await response.json();
          if (responseData.success && responseData.data?.user) {
            set({ user: responseData.data.user });
          } else {
            throw new Error(responseData.message || 'Failed to update user');
          }
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to update user: ${response.status}`);
        }
      },

      signOut: () => {
        localStorage.removeItem('google_token');
        set({ 
          user: null, 
          isAuthenticated: false 
        });
        
        if (window.google) {
          window.google.accounts.id.disableAutoSelect();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
