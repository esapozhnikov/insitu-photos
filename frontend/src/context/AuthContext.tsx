import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setAccessToken } from '../api/client';
import { UserRole } from '../types';

interface User {
  username: string;
  role: UserRole;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  isViewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = async () => {
    try {
      // Attempt to refresh token first to see if we have a valid refresh cookie
      const { access_token } = await api.login({ username: '', password: '' }).catch(async () => {
        // If empty login fails (expected), try the refresh endpoint directly
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (res.ok) return await res.json();
        throw new Error('No session');
      });
      
      setAccessToken(access_token);
      const userData = await api.getMe();
      setUser(userData);
    } catch (err) {
      console.log("No active session found");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  const login = async (credentials: any) => {
    const data = await api.login(credentials);
    const userData = await api.getMe();
    setUser(userData);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === UserRole.ADMIN,
    isUser: user?.role === UserRole.USER || user?.role === UserRole.ADMIN,
    isViewer: user?.role === UserRole.VIEWER || user?.role === UserRole.USER || user?.role === UserRole.ADMIN,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
