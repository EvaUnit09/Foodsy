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
      console.log('AuthContext: Starting auth check with refresh token flow');
      
      // Step 1: Try to refresh the token first
      console.log('AuthContext: Attempting to refresh token...');
      const refreshResponse = await ApiClient.auth.refreshToken();
      console.log('AuthContext: Refresh token response:', refreshResponse);
      
      // Step 2: If refresh successful, get user data
      console.log('AuthContext: Getting user data...');
      const userData = await ApiClient.auth.me();
      console.log('AuthContext: User data received:', userData);
      
      setUser(userData);
      setIsAuthenticated(true);
      console.log('AuthContext: Authentication successful');
      
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