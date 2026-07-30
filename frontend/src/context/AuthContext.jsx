import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const googleAuth = async (payload) => {
    const { data } = await api.post('/auth/google', payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  /** Establish a session from a { token, user } response (e.g. after a password reset). */
  const applySession = ({ token, user: sessionUser }) => {
    setToken(token);
    setUser(sessionUser);
    return sessionUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    window.location.assign('/login');
  };

  // Allow pages to refresh credits/minutes after actions.
  const refreshUser = loadMe;
  const patchUser = (partial) => setUser((u) => (u ? { ...u, ...partial } : u));

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, googleAuth, applySession, logout, refreshUser, patchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
