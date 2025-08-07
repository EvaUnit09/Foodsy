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
      const storedAccessToken = localStorage.getItem('accessToken');
      
      if (storedUser && storedAccessToken) {
        try {
          const userData = JSON.parse(storedUser);
          console.log('AuthContext: Found stored user data:', userData);
          
          // Verify the stored data is still valid by calling /me
          try {
            const currentUser = await ApiClient.auth.me();
            console.log('AuthContext: Stored user data is still valid:', currentUser);
            setUser(currentUser);
            setIsAuthenticated(true);
            console.log('AuthContext: Authentication successful from stored data');
            return;
          } catch (meError: any) {
            // If /me fails with 401, try refreshing token
            if (meError.status === 401) {
              console.log('AuthContext: Stored token expired, trying refresh...');
              try {
                const refreshResponse = await ApiClient.auth.refreshToken();
                console.log('AuthContext: Refresh successful:', refreshResponse);
                
                // Update access token if provided
                if (refreshResponse.accessToken) {
                  localStorage.setItem('accessToken', refreshResponse.accessToken);
                }
                
                // Get updated user data
                const currentUser = await ApiClient.auth.me();
                console.log('AuthContext: User data after refresh:', currentUser);
                setUser(currentUser);
                setIsAuthenticated(true);
                console.log('AuthContext: Authentication successful after refresh');
                return;
              } catch (refreshError: any) {
                console.log('AuthContext: Refresh failed, clearing stored data');
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
                setUser(null);
                setIsAuthenticated(false);
              }
            } else {
              // Other error, clear stored data
              console.log('AuthContext: /me failed with non-401 error, clearing stored data');
              localStorage.removeItem('user');
              localStorage.removeItem('accessToken');
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        } catch (e) {
          console.log('AuthContext: Invalid stored user data, clearing');
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
        }
      }
      
      // If no stored user or stored data is invalid, check for refresh token
      console.log('AuthContext: No valid stored data, checking for refresh token...');
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