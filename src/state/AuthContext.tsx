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
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
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
    if (!error) return {};
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('email not confirmed'))
      return { error: '此帳戶尚未完成信箱驗證，請先至信箱點擊驗證連結。' };
    if (msg.includes('invalid login credentials'))
      return { error: 'Email 或密碼有誤，請重新確認。' };
    return { error: '登入失敗，請稍後再試。' };
  }, []);

  const signUp = useCallback(
    async (params: { name: string; email: string; phone: string; password: string }) => {
      const { error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
        options: { data: { name: params.name, phone: params.phone } },
      });
      if (!error) return {};
      const msg = error.message?.toLowerCase() ?? '';
      const code = (error as { code?: string }).code ?? '';
      if (
        error.status === 429 ||
        code.includes('rate_limit') ||
        msg.includes('rate limit')
      )
        return { error: '目前註冊人數過多（寄信額度已滿），請稍後再試。' };
      if (msg.includes('already registered') || msg.includes('already been registered'))
        return { error: '此 Email 已註冊過，請直接登入。' };
      if (msg.includes('password'))
        return { error: '密碼強度不足，請使用至少 8 碼並包含英數字。' };
      if (msg.includes('invalid') && msg.includes('email'))
        return { error: 'Email 格式不正確，請重新確認。' };
      return { error: '註冊未成功，請確認資料或稍後再試。' };
    },
    [],
  );

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (!error) return {};
    const msg = error.message?.toLowerCase() ?? '';
    const code = (error as { code?: string }).code ?? '';
    if (error.status === 429 || code.includes('rate_limit') || msg.includes('rate limit'))
      return { error: '寄信次數過多，請稍後再試。' };
    return { error: '無法寄送重設信，請確認 Email 後再試。' };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) return {};
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('password'))
      return { error: '密碼強度不足，請使用至少 8 碼並包含英數字。' };
    if (msg.includes('session') || msg.includes('expired') || msg.includes('token'))
      return { error: '重設連結已失效，請重新申請忘記密碼。' };
    return { error: '密碼更新失敗，請稍後再試。' };
  }, []);

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
        resetPassword,
        updatePassword,
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
