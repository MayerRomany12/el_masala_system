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
    try {
      const response = await apiClient.post('/auth/login', { username, password });
      if (response.data && response.data.success) {
        const { access_token, user: userData } = response.data.data;
        localStorage.setItem('almasalla_token', access_token);
        localStorage.setItem('almasalla_user', JSON.stringify(userData));
        setToken(access_token);
        setUser(userData);

        // Fetch user permissions immediately upon login
        try {
          const meRes = await apiClient.get('/auth/me');
          if (meRes.data && meRes.data.success) {
            setPermissions(meRes.data.data.permissions || []);
          }
        } catch (e) {
          if (userData?.effective_permissions) {
            setPermissions(userData.effective_permissions);
          }
        }
        return userData;
      } else {
        throw new Error(response?.data?.message || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      let errorMsg = 'اسم المستخدم أو كلمة المرور غير صحيحة';
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.data?.detail) {
        errorMsg = typeof err.response.data.detail === 'string'
          ? err.response.data.detail
          : 'اسم المستخدم أو كلمة المرور غير صحيحة';
      } else if (err.response?.status === 500) {
        errorMsg = 'تعذر الاتصال بقاعدة البيانات أو الخادم (500). يرجى التأكد من تشغيل الخادم وضبط DATABASE_URL.';
      } else if (err.message && !err.message.includes('status code')) {
        errorMsg = err.message;
      }
      throw new Error(errorMsg);
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
