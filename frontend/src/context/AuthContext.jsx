import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('almasalla_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [permissions, setPermissions] = useState(() => {
    try {
      const saved = localStorage.getItem('almasalla_user');
      if (saved) {
        const u = JSON.parse(saved);
        return Array.isArray(u.effective_permissions) ? u.effective_permissions : [];
      }
    } catch (e) {}
    return [];
  });
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
        const fetchedUser = response.data.data.user;
        const fetchedPerms = response.data.data.permissions || fetchedUser?.effective_permissions || [];
        setUser(fetchedUser);
        setPermissions(fetchedPerms);
        localStorage.setItem('almasalla_user', JSON.stringify({ ...fetchedUser, effective_permissions: fetchedPerms }));
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
        const userPerms = Array.isArray(userData?.effective_permissions) ? userData.effective_permissions : [];
        localStorage.setItem('almasalla_token', access_token);
        localStorage.setItem('almasalla_user', JSON.stringify(userData));
        setToken(access_token);
        setUser(userData);
        setPermissions(userPerms);

        // Fetch user permissions immediately upon login
        try {
          const meRes = await apiClient.get('/auth/me');
          if (meRes.data && meRes.data.success) {
            const finalPerms = meRes.data.data.permissions || userPerms;
            setPermissions(finalPerms);
            localStorage.setItem('almasalla_user', JSON.stringify({ ...userData, effective_permissions: finalPerms }));
          }
        } catch (e) {
          // fallback is already set
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
    // Only Super Admin bypasses individual permission revocations
    if (user?.role === 'Super Admin' || user?.username === 'superadmin') return true;
    return Array.isArray(permissions) && permissions.includes(permission);
  };

  const hasAnyPermission = (permList = []) => {
    if (!permList || permList.length === 0) return true;
    if (user?.role === 'Super Admin' || user?.username === 'superadmin') return true;
    return permList.some(p => hasPermission(p));
  };

  return (
    <AuthContext.Provider value={{ user, token, permissions, loading, login, logout, hasPermission, hasAnyPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
