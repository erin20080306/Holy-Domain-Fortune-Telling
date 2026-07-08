import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

interface Subscription {
  plan: string;
  status: string;
  source: string;
  current_period_end: string | null;
}

interface AuthState {
  session: Session | null;
  loading: boolean;
  subscription: Subscription | null;
  isAdmin: boolean;
  refreshSubscription: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (params: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshSubscription = useCallback(async () => {
    try {
      const res = await api.getSubscription();
      if (res?.ok) setSubscription(res.subscription);
      // Role is resolved server-side; probe admin stats to know if admin.
      const stats = await api.admin.stats();
      setIsAdmin(!!stats?.ok);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      // Ensure backend profile/subscription/quota exist + record login.
      void api
        .bootstrap({ display_name: (session.user.user_metadata as any)?.name })
        .then(() => refreshSubscription());
    } else {
      setSubscription(null);
      setIsAdmin(false);
    }
  }, [session, refreshSubscription]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: '登入資訊有誤，請重新確認。' } : {};
  }, []);

  const signUp = useCallback(
    async (params: { name: string; email: string; phone: string; password: string }) => {
      const { error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: { data: { name: params.name, phone: params.phone } },
      });
      return error ? { error: '註冊未成功，請確認資料或稍後再試。' } : {};
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Clear local PWA scratch on logout.
    try {
      localStorage.removeItem('mystic.perfMode');
    } catch {
      /* ignore */
    }
    setSubscription(null);
    setIsAdmin(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        subscription,
        isAdmin,
        refreshSubscription,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
