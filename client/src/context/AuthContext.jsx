import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext();
export const TOKEN_KEY = 'fittrack_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/profile');
        if (response.data?.success) {
          setUser(response.data.user);
          setToken(storedToken);
        } else {
          logout();
        }
      } catch (err) {
        console.warn(
          'Failed to restore auth session:',
          err?.response?.data?.message || err.message
        );
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  const register = async (name, email, password) => {
    try {
      const response = await api.post('/auth/register', {
        name,
        email: email.trim().toLowerCase(),
        password,
      });
      const { user: userData, token: newToken } = response.data;
      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setUser(userData);
      }
      return response.data;
    } catch (err) {
      const message = err?.response?.data?.message || 'Registration failed. Please try again.';
      throw new Error(message);
    }
  };

  const registerTrainer = async (name, email, password) => {
    try {
      const response = await api.post('/trainers/register', {
        name,
        email: email.trim().toLowerCase(),
        password,
      });
      return response.data;
    } catch (err) {
      const message =
        err?.response?.data?.message || 'Trainer registration failed. Please try again.';
      throw new Error(message);
    }
  };

  const establishSession = ({ user: userData, token: newToken }) => {
    if (!userData || !newToken) {
      throw new Error('The server did not return a valid sign-in session.');
    }
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(userData);
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      const { user: userData, token: newToken } = response.data;
      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setUser(userData);
      }
      return response.data;
    } catch (err) {
      const message = err?.response?.data?.message || 'Login failed. Invalid credentials.';
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    registerTrainer,
    establishSession,
    logout,
    updateUser: setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
