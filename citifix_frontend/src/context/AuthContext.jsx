import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await authAPI.getCurrentUser();
      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };
  
  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      if (response.data.success) {
        const { user: userData, tokens } = response.data.data;
        localStorage.setItem('access_token', tokens.access);
        localStorage.setItem('refresh_token', tokens.refresh);
        setUser(userData);
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };
  
  const register = async (userData, userType) => {
    try {
      let response;
      switch (userType) {
        case 'citizen':
          response = await authAPI.registerCitizen(userData);
          break;
        case 'authority':
          response = await authAPI.registerAuthority(userData);
          break;
        case 'media_house':
          response = await authAPI.registerMediaHouse(userData);
          break;
        default:
          throw new Error('Invalid user type');
      }
      
      if (response.data.success) {
        if (userType === 'citizen' && response.data.data.tokens) {
          const { user: userData, tokens } = response.data.data;
          localStorage.setItem('access_token', tokens.access);
          localStorage.setItem('refresh_token', tokens.refresh);
          setUser(userData);
        }
        return { success: true, data: response.data };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };
  
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};