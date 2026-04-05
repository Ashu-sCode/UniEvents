'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { authAPI } from '@/lib/api';
import type { SignupInput, User } from '@/types';
import { useLoading } from '@/context/LoadingContext';
import { getPostAuthRoute } from '@/lib/authState';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupInput) => Promise<void>;
  logout: () => void;
  /** Update cached user in state + localStorage (used by Profile module). */
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { showGlobalLoader, hideGlobalLoader } = useLoading();

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    showGlobalLoader();
    try {
      const response = await authAPI.login({ email, password });
      const { user: userData, token: authToken } = response.data.data;

      setUser(userData);
      setToken(authToken);
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

      router.push(getPostAuthRoute(userData));
    } finally {
      hideGlobalLoader();
    }
  };

  const signup = async (data: SignupInput) => {
    showGlobalLoader();
    try {
      const payload = new FormData();
      payload.append('name', data.name);
      payload.append('email', data.email);
      payload.append('password', data.password);
      payload.append('department', data.department);
      payload.append('role', data.role);

      if (data.rollNumber) {
        payload.append('rollNumber', data.rollNumber);
      }

      if (data.idCard) {
        payload.append('idCard', data.idCard);
      }

      const response = await authAPI.signup(payload);
      const { user: userData, token: authToken } = response.data.data;

      setUser(userData);
      setToken(authToken);
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
      api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

      router.push(getPostAuthRoute(userData));
    } finally {
      hideGlobalLoader();
    }
  };

  const updateUser = (nextUser: User) => {
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  const logout = () => {
    showGlobalLoader();
    try {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      router.push('/login');
    } finally {
      hideGlobalLoader();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
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
