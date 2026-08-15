import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('almasalla_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [permissions, setPermissions] = useState([]);
  const [token, setToken] = useState(() => localStorage.getItem('almasalla_token') || null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const storedToken = localStorage.getItem('almasalla_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      const response = await apiClient.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.data.user);
        setPermissions(response.data.data.permissions || []);
        localStorage.setItem('almasalla_user', JSON.stringify(response.data.data.user));
      }
    } catch (err) {
      console.error('Failed to fetch user context:', err);
      // Only logout on explicit 401 Unauthorized
      if (err.response && err.response.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [token]);

  const login = async (username, password) => {
    const response = await apiClient.post('/auth/login', { username, password });
    if (response.data.success) {
      const { access_token, user: userData } = response.data.data;
      localStorage.setItem('almasalla_token', access_token);
      localStorage.setItem('almasalla_user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);

      // Fetch user permissions immediately upon login
      try {
        const meRes = await apiClient.get('/auth/me');
        if (meRes.data.success) {
          setPermissions(meRes.data.data.permissions || []);
        }
      } catch (e) {
        // Ignore non-critical permission error if user is admin
      }
      return userData;
    } else {
      throw new Error(response.data.message || 'فشل تسجيل الدخول');
    }
  };

  const logout = () => {
    localStorage.removeItem('almasalla_token');
    localStorage.removeItem('almasalla_user');
    setToken(null);
    setUser(null);
    setPermissions([]);
  };

  const hasPermission = (permission) => {
    if (!permission) return true;
    if (user?.role === 'Super Admin' || user?.role === 'Admin') return true;
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, token, permissions, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
