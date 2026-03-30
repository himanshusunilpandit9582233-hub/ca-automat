import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Configure axios defaults
axios.defaults.withCredentials = true;

// Error formatter
function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = not authenticated, object = authenticated
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check auth on mount
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const { data } = await axios.get(`${API_URL}/api/auth/me`, {
        withCredentials: true,
        headers
      });
      setUser(data);
    } catch (e) {
      setUser(false);
      localStorage.removeItem('access_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const register = async (email, password, name, phone) => {
    setError(null);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/auth/register`,
        { email, password, name, phone },
        { withCredentials: true }
      );
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
      }
      setUser(data);
      return { success: true, data };
    } catch (e) {
      const errorMsg = formatApiErrorDetail(e.response?.data?.detail) || e.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
      }
      setUser(data);
      return { success: true, data };
    } catch (e) {
      const errorMsg = formatApiErrorDetail(e.response?.data?.detail) || e.message;
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('access_token');
      setUser(false);
    }
  };

  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  };

  const refreshAuth = async () => {
    await checkAuth();
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    updateUser,
    refreshAuth,
    isAuthenticated: !!user && user !== false,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
