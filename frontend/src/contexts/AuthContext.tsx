"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiClient } from '@/api/client';

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  avatarUrl?: string;
  provider: string;
  emailVerified: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (userData: User) => void;
  signOut: () => void;
  checkAuthStatus: () => Promise<void>;
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
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      console.log('AuthContext: Starting auth check');
      
      // Check if we have a user in localStorage from OAuth2 flow
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('AuthContext: Found stored user data:', userData);
          setUser(userData);
          setIsAuthenticated(true);
          console.log('AuthContext: Authentication successful from stored data');
          return;
        } catch (e) {
          console.log('AuthContext: Invalid stored user data, clearing');
          localStorage.removeItem('user');
        }
      }
      
      // If no stored user, try to refresh token (but don't treat 401 as error)
      console.log('AuthContext: No stored user, checking for refresh token...');
      try {
        const refreshResponse = await ApiClient.auth.refreshToken();
        console.log('AuthContext: Refresh token successful:', refreshResponse);
        
        // If refresh successful, get user data
        const userData = await ApiClient.auth.me();
        console.log('AuthContext: User data received:', userData);
        
        setUser(userData);
        setIsAuthenticated(true);
        console.log('AuthContext: Authentication successful');
        
      } catch (refreshError: any) {
        // 401 is expected when no refresh token exists - this is not an error
        if (refreshError.status === 401 || refreshError.message?.includes('401')) {
          console.log('AuthContext: No refresh token available (normal for new users)');
          setUser(null);
          setIsAuthenticated(false);
        } else {
          // Only log as error if it's not a 401
          console.error('AuthContext: Unexpected error during refresh:', refreshError);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      
    } catch (error) {
      console.error('AuthContext: Error checking auth status:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const signIn = (userData: User) => {
    console.log("AuthContext: Signing in user:", userData);
    setUser(userData);
    setIsAuthenticated(true);
    console.log("AuthContext: User signed in successfully");
  };

  const signOut = async () => {
    console.log("AuthContext: Signing out user");
    try {
      await ApiClient.auth.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      console.log("AuthContext: User signed out successfully");
      
      // Clear any remaining localStorage data
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userId');
      sessionStorage.clear();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};