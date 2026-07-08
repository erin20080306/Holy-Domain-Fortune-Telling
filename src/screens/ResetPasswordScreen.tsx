import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { supabase } from '../lib/supabase';

export function ResetPasswordScreen() {
  const nav = useNavigate();
  const { updatePassword } = useAuth();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Supabase (detectSessionInUrl) parses the recovery token from the URL and
  // fires a PASSWORD_RECOVERY event, giving us a temporary session that allows
  // updating the password. Wait until a session exists before enabling the form.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    setError('');
    setNotice('');
    if (password.length < 8) return setError('密碼至少需 8 碼。');
    if (password !== confirm) return setError('兩次輸入的密碼不一致。');
    setBusy(true);
    const res = await updatePassword(password);
    setBusy(false);
    if (res.error) return setError(res.error);
    setNotice('密碼已更新，即將前往登入…');
    setTimeout(() => {
      void supabase.auth.signOut();
      nav('/auth?mode=login');
    }, 1500);
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-[fadeIn_0.5s_ease-out]">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif text-white tracking-widest mb-2">重設密碼</h2>
        <p className="text-[#A89882] text-xs tracking-[0.3em] uppercase">Reset Password</p>
      </div>

      {!ready ? (
        <p className="text-white/50 text-sm tracking-wider text-center leading-relaxed">
          正在確認重設連結…
          <br />
          若長時間停留在此，代表連結已失效，請重新申請忘記密碼。
        </p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-6">
          <div className="relative">
            <Lock className="absolute left-0 top-3 text-white/30" size={18} />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="新密碼 New Password"
              className="w-full bg-transparent border-b border-white/20 pl-8 pr-4 py-3 text-white font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors placeholder-white/30 text-sm"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-0 top-3 text-white/30" size={18} />
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="再次輸入新密碼 Confirm"
              className="w-full bg-transparent border-b border-white/20 pl-8 pr-4 py-3 text-white font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors placeholder-white/30 text-sm"
            />
          </div>

          {error && (
            <p style={{ color: '#e0a97a', fontSize: 14, margin: '4px 0 12px' }}>{error}</p>
          )}
          {notice && (
            <p style={{ color: '#8fcaa0', fontSize: 14, margin: '4px 0 12px' }}>{notice}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-4 mt-8 bg-[#A89882] text-[#050508] font-medium tracking-[0.2em] rounded-full hover:bg-white transition-colors flex justify-center items-center gap-2"
          >
            {busy ? '處理中…' : '更新密碼'}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
