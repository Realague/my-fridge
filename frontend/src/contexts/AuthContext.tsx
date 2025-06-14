import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
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
        await verifyTokenWithBackend(token);
      } catch (error) {
        console.error('Stored token verification failed:', error);
        localStorage.removeItem('google_token');
      }
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
      const data = await response.json();
      setUser(data.user);
      setIsAuthenticated(true);
    } else {
      console.error('Backend token verification failed:', response.status);
      throw new Error('Token verification failed');
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        console.error('Google SDK not loaded');
        reject(new Error('Google SDK not loaded'));
        return;
      }

      if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        console.error('Google Client ID not configured');
        reject(new Error('Google Client ID not configured'));
        return;
      }

      try {
        // Use the simpler popup approach
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // If prompt doesn't work, render the sign-in button programmatically
            const buttonDiv = document.createElement('div');
            document.body.appendChild(buttonDiv);
            
            window.google.accounts.id.renderButton(buttonDiv, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              text: 'signin_with',
            });
            
            // Click the button programmatically
            setTimeout(() => {
              const button = buttonDiv.querySelector('iframe');
              if (button) {
                button.click();
              }
              document.body.removeChild(buttonDiv);
            }, 100);
            
            // Set up a listener for the response
            const originalCallback = window.google.accounts.id.callback;
            window.google.accounts.id.callback = (response: any) => {
              handleGoogleResponse(response).then(() => resolve()).catch(reject);
              window.google.accounts.id.callback = originalCallback;
            };
          } else {
            resolve();
          }
        });
      } catch (error) {
        console.error('Error initiating Google OAuth:', error);
        reject(error);
      }
    });
  };

  const signOut = () => {
    localStorage.removeItem('google_token');
    setUser(null);
    setIsAuthenticated(false);
    
    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signInWithGoogle,
    signOut,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 