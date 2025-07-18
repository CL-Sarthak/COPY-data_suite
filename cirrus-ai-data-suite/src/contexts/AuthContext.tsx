'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Check if we're in development mode
  // In client-side, we can check if we're on localhost or if NODE_ENV is development
  const isDevelopment = typeof window !== 'undefined' ? 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || process.env.NODE_ENV === 'development') :
    process.env.NODE_ENV === 'development';

  useEffect(() => {
    // In development, automatically authenticate
    // Check multiple conditions to ensure we're in development
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isDevPort = typeof window !== 'undefined' && 
      (window.location.port === '3000' || window.location.port === '3001');
    const isDevEnv = process.env.NODE_ENV === 'development';
    
    if (isDevelopment || isLocalhost || isDevPort || isDevEnv) {
      console.log('Development mode detected, auto-authenticating...');
      setIsAuthenticated(true);
      setInitializing(false);
      return;
    }

    // In production, check for existing session
    const checkAuth = () => {
      const authToken = localStorage.getItem('cirrus_auth_token');
      const authExpiry = localStorage.getItem('cirrus_auth_expiry');
      
      if (authToken && authExpiry) {
        const expiryDate = new Date(authExpiry);
        if (expiryDate > new Date()) {
          setIsAuthenticated(true);
        } else {
          // Token expired, clear storage
          localStorage.removeItem('cirrus_auth_token');
          localStorage.removeItem('cirrus_auth_expiry');
        }
      }
      setInitializing(false);
    };

    checkAuth();
  }, [isDevelopment]);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Check if we're in development mode
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isDevPort = typeof window !== 'undefined' && 
      (window.location.port === '3000' || window.location.port === '3001');
    const isDevEnv = process.env.NODE_ENV === 'development';
    
    if (isDevelopment || isLocalhost || isDevPort || isDevEnv) {
      setIsAuthenticated(true);
      return true;
    }

    setLoading(true);
    setError(null);

    try {
      // Simple credential check for demo purposes
      if (username === 'cirrus' && password === 'cldata') {
        // Create a session token (simple timestamp-based for demo)
        const token = btoa(`${username}:${Date.now()}`);
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24); // 24 hour session

        localStorage.setItem('cirrus_auth_token', token);
        localStorage.setItem('cirrus_auth_expiry', expiry.toISOString());
        
        setIsAuthenticated(true);
        return true;
      } else {
        setError('Invalid username or password');
        return false;
      }
    } catch {
      setError('An error occurred during login');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('cirrus_auth_token');
    localStorage.removeItem('cirrus_auth_expiry');
    setIsAuthenticated(false);
    setError(null);
  };

  // Show loading spinner during initialization
  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}