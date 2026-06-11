import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setToken, getToken } from './api';
import type { AuthUser, LoginResult } from './types';

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (dni: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try { setUser(await api.get<AuthUser>('/auth/me')); }
    catch { setUser(null); setToken(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function login(dni: string, password: string) {
    const r = await api.post<LoginResult>('/auth/login', { dni, password });
    setToken(r.token);
    setUser(r.user);
    return r;
  }
  function logout() { setToken(null); setUser(null); }

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}
