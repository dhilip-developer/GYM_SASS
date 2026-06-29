import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axiosInstance from '../api/axiosInstance';

interface AuthContextType {
  token: string | null;
  user: any | null;
  isLoading: boolean;
  login: (token: string, user: any) => void;
  logout: () => void;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('gymOS_token'));
  const [user, setUser] = useState<any | null>(() => {
    const storedUser = localStorage.getItem('gymOS_user');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = (newToken: string, newUser: any) => {
    localStorage.setItem('gymOS_token', newToken);
    localStorage.setItem('gymOS_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('gymOS_token');
    localStorage.removeItem('gymOS_user');
    setToken(null);
    setUser(null);
  };

  const validateSession = async (): Promise<boolean> => {
    const storedToken = localStorage.getItem('gymOS_token');
    if (!storedToken) {
      setIsLoading(false);
      return false;
    }

    try {
      const response = await axiosInstance.get('/api/auth/me');
      const verifiedUser = response.data.user;
      setUser(verifiedUser);
      localStorage.setItem('gymOS_user', JSON.stringify(verifiedUser));
      return true;
    } catch (error) {
      console.error('[AUTH] Session validation failed:', error);
      logout();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    validateSession();
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, validateSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
