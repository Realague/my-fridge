
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

interface TokenInfo {
  accessToken: string;
  accessTokenExpiresAt: Date;
}

interface AuthState {
  user: User | null;
  tokens: TokenInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: TokenInfo | null) => void;
  setLoading: (loading: boolean) => void;
  setAuthenticated: (authenticated: boolean) => void;
  signInWithGoogle: () => void;
  signOut: () => void;
  refreshTokens: () => Promise<boolean>;
  updateUser: (firstName: string, lastName: string) => Promise<void>;
  initializeGoogleAuth: () => void;
  checkStoredAuth: () => Promise<void>;
  isTokenExpired: (token: string) => boolean;
  getValidAccessToken: () => Promise<string | null>;
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
      tokens: null,
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
      setTokens: (tokens) => set({ tokens }),
      setLoading: (loading) => set({ isLoading: loading }),
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),

      initializeGoogleAuth: () => {
        // Pure OAuth2 flow - no Google SDK needed
        console.log('Initializing OAuth2-only authentication');
        get().checkStoredAuth();
      },


      checkStoredAuth: async () => {
        const state = get();
        
        // Check if we have stored tokens
        if (state.tokens?.accessToken) {
          try {
            console.log('Checking stored access token...');
            // Check if access token is expired
            if (get().isTokenExpired(state.tokens.accessToken)) {
              console.log('Access token is expired, attempting refresh...');
              // Try to refresh the token
              const refreshed = await get().refreshTokens();
              if (!refreshed) {
                console.log('Token refresh failed, clearing auth state');
                set({ user: null, tokens: null, isAuthenticated: false });
              } else {
                console.log('Token refresh successful');
              }
            } else {
              // Token is still valid, keep current state
              set({ isAuthenticated: true });
            }
          } catch (error) {
            console.error('Token validation failed:', error);
            set({ user: null, tokens: null, isAuthenticated: false });
          }
        } else {
          // No tokens found, ensure auth state is clear
          set({ user: null, tokens: null, isAuthenticated: false });
        }
        // Always set loading to false after checking stored auth
        set({ isLoading: false });
      },

      isTokenExpired: (token: string): boolean => {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          const isExpired = payload.exp < currentTime;
          
          if (isExpired) {
            const expiredAgo = currentTime - payload.exp;
          }
          
          return isExpired;
        } catch (error) {
          console.error('Error parsing token:', error);
          return true;
        }
      },

      refreshTokens: async (): Promise<boolean> => {
        try {
          const state = get();
          if (!state.tokens?.accessToken) {
            return false;
          }

          const response = await fetch(`${import.meta.env.VITE_API_URL || 'localhost:3000'}/auth/refresh`, {
            method: 'POST',
            headers: getAuthHeaders(state.tokens.accessToken),
          });

          if (response.ok) {
            const responseData = await response.json();
            const tokenData = responseData.data;
            
            const newTokens: TokenInfo = {
              accessToken: tokenData.accessToken,
              accessTokenExpiresAt: new Date(tokenData.accessTokenExpiresAt)
            };
            
            set({ tokens: newTokens });
            return true;
          } else {
            console.error('Token refresh failed:', response.status);
            return false;
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          return false;
        }
      },

      signInWithGoogle: () => {
        // Pure OAuth2 authorization code flow
        console.log('Starting OAuth2 flow...');
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const redirectUri = `${window.location.origin}/auth`;
        
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'openid email profile',
          access_type: 'offline', // Required for refresh tokens
          prompt: 'consent',      // Force consent to get refresh token
          include_granted_scopes: 'true'
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        console.log('Redirecting to:', authUrl);
        window.location.href = authUrl;
      },

      getValidAccessToken: async (): Promise<string | null> => {
        const state = get();
        if (!state.tokens?.accessToken) {
          return null;
        }

        // Check if token is expired
        if (get().isTokenExpired(state.tokens.accessToken)) {
          // Try to refresh
          const refreshed = await get().refreshTokens();
          if (!refreshed) {
            return null;
          }
          // Get the new token after refresh
          return get().tokens?.accessToken || null;
        }

        return state.tokens.accessToken;
      },

      updateUser: async (firstName: string, lastName: string) => {
        const token = await get().getValidAccessToken();
        if (!token) {
          throw new Error('No valid authentication token found');
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
        set({ 
          user: null,
          tokens: null,
          isAuthenticated: false 
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
