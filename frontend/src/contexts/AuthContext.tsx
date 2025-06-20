import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  selectedHouseholdId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => void;
  signOut: () => void;
  refreshToken: () => Promise<boolean>;
  checkTokenExpiry: () => boolean;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

declare global {
  interface Window {
    google: any;
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Load Google's JavaScript SDK
    loadGoogleSDK();
  }, []);

  const loadGoogleSDK = () => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleAuth;
    script.onerror = () => {
      console.error('Failed to load Google SDK');
      setIsLoading(false);
    };
    document.head.appendChild(script);
  };

  const initializeGoogleAuth = () => {
    if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
        });
        
        // Check if user is already authenticated
        checkStoredAuth();
      } catch (error) {
        console.error('Error initializing Google Auth:', error);
      }
    } else {
      console.error('Google SDK not available or Client ID missing');
      if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        console.error('VITE_GOOGLE_CLIENT_ID environment variable is not set');
      }
    }
    setIsLoading(false);
  };

  const checkStoredAuth = async () => {
    const token = localStorage.getItem('google_token');
    if (token) {
      try {
        // Check if token is expired before trying to use it
        if (isTokenExpired(token)) {
          console.log('Stored token is expired, attempting refresh...');
          const refreshed = await refreshToken();
          if (!refreshed) {
            localStorage.removeItem('google_token');
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          await verifyTokenWithBackend(token);
        }
      } catch (error) {
        console.error('Stored token verification failed:', error);
        localStorage.removeItem('google_token');
        setUser(null);
        setIsAuthenticated(false);
      }
    }
  };

  // Check if JWT token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error parsing token:', error);
      return true;
    }
  };

  // Check token expiry (public method)
  const checkTokenExpiry = (): boolean => {
    const token = localStorage.getItem('google_token');
    if (!token) return true;
    return isTokenExpired(token);
  };

  // Refresh the Google token
  const refreshToken = async (): Promise<boolean> => {
    try {
      console.log('Attempting to refresh Google token...');
      
      // Prompt user to re-authenticate with Google
      return new Promise((resolve) => {
        if (window.google) {
          window.google.accounts.id.prompt((notification: any) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
              console.log('Token refresh failed - user interaction required');
              resolve(false);
            }
          });
          
          // Set a timeout for the refresh attempt
          setTimeout(() => {
            console.log('Token refresh timed out');
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
  };

  const handleGoogleResponse = async (response: any) => {
    try {
      const token = response.credential;
      localStorage.setItem('google_token', token);
      await verifyTokenWithBackend(token);
    } catch (error) {
      console.error('Google auth failed:', error);
    }
  };

  const verifyTokenWithBackend = async (token: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/verify-google-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (response.ok) {
      const resonseData = await response.json();
      setUser(resonseData.data.user);
      setIsAuthenticated(true);
    } else {
      console.error('Backend token verification failed:', response.status);
      throw new Error('Token verification failed');
    }
  };

  const signInWithGoogle = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  };

  const signOut = () => {
    localStorage.removeItem('google_token');
    setUser(null);
    setIsAuthenticated(false);
    
    // Sign out from Google
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  const updateUser = (userData: User) => {
      setUser(userData)
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      signInWithGoogle,
      signOut,
      refreshToken,
      checkTokenExpiry,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 