import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { setAdminSession } from '../lib/adminSession';

const ADMIN_EMAIL = 'erin20080306@gmail.com';

export function AuthScreen() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(
    params.get('mode') === 'login' ? 'login' : 'register',
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const checkoutPlan = params.get('checkout');

  const validPhone = (v: string) => /^[+()\-\s\d]{7,20}$/.test(v);
  const validName = (v: string) => /^[\u4e00-\u9fff a-zA-Z]+$/.test(v);

  const switchMode = (m: 'login' | 'register' | 'forgot') => {
    setError('');
    setNotice('');
    setMode(m);
  };

  const submit = async () => {
    setError('');
    setNotice('');

    if (mode === 'forgot') {
      if (!email) return setError('請輸入 email。');
      setBusy(true);
      const res = await resetPassword(email);
      setBusy(false);
      if (res.error) return setError(res.error);
      return setNotice('重設信已寄出，請至信箱點擊連結重設密碼。');
    }

    if (!email || !password) return setError('請輸入 email 與密碼。');
    if (mode === 'register') {
      if (!name) return setError('請輸入姓名。');
      if (!validName(name)) return setError('姓名只能輸入中文或英文。');
      if (!validPhone(phone)) return setError('電話格式不正確。');
      if (password.length < 8) return setError('密碼至少需 8 碼。');
    }
    setBusy(true);

    // Admin login: authenticate with a real Supabase session so the backend
    // recognises the account (auto-promoted to super_admin via ADMIN_EMAILS)
    // and admin APIs are authorised. Then route to the admin console.
    const isAdminLogin = mode === 'login' && email.toLowerCase() === ADMIN_EMAIL;

    const res =
      mode === 'login'
        ? await signIn(email, password)
        : await signUp({ name, email, phone, password });
    setBusy(false);
    if (res.error) return setError(res.error);

    if (isAdminLogin) {
      setAdminSession();
      nav('/admin');
      return;
    }
    if (checkoutPlan === 'pro_monthly' || checkoutPlan === 'master_monthly') {
      nav(`/plans?checkout=${checkoutPlan}`);
      return;
    }
    nav('/app');
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-[fadeIn_0.5s_ease-out]">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif text-white tracking-widest mb-2">
          {mode === 'login' ? '登入星域' : mode === 'register' ? '註冊命盤' : '重設密碼'}
        </h2>
        <p className="text-[#A89882] text-xs tracking-[0.3em] uppercase">
          {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
        </p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-6">
        {mode === 'register' && (
          <div className="relative">
            <User className="absolute left-0 top-3 text-white/30" size={18} />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="真實姓名 Name"
              className="w-full bg-transparent border-b border-white/20 pl-8 pr-4 py-3 text-white font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors placeholder-white/30 text-sm"
            />
          </div>
        )}
        <div className="relative">
          <Mail className="absolute left-0 top-3 text-white/30" size={18} />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="電子郵件 Email"
            className="w-full bg-transparent border-b border-white/20 pl-8 pr-4 py-3 text-white font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors placeholder-white/30 text-sm"
          />
        </div>
        {mode === 'register' && (
          <div className="relative">
            <Phone className="absolute left-0 top-3 text-white/30" size={18} />
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="聯絡電話 Phone"
              className="w-full bg-transparent border-b border-white/20 pl-8 pr-4 py-3 text-white font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors placeholder-white/30 text-sm"
            />
          </div>
        )}
        {mode !== 'forgot' && (
          <div className="relative">
            <Lock className="absolute left-0 top-3 text-white/30" size={18} />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密碼 Password"
              className="w-full bg-transparent border-b border-white/20 pl-8 pr-4 py-3 text-white font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors placeholder-white/30 text-sm"
            />
          </div>
        )}

        {mode === 'login' && (
          <div className="text-right">
            <span
              onClick={() => switchMode('forgot')}
              className="text-[#A89882]/80 text-xs tracking-wider cursor-pointer hover:text-white transition-colors"
            >
              忘記密碼？
            </span>
          </div>
        )}

        {mode === 'forgot' && (
          <p className="text-white/40 text-xs tracking-wider leading-relaxed">
            輸入註冊時的 email，我們會寄送密碼重設連結到你的信箱。
          </p>
        )}

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
          {busy ? '處理中…' : mode === 'login' ? '確認登入' : mode === 'register' ? '完成註冊' : '寄送重設信'}
          <ArrowRight size={16} />
        </button>
      </form>
      <div className="mt-8 text-center">
        {mode === 'forgot' ? (
          <p className="text-white/50 text-xs tracking-wider">
            想起密碼了？
            <span
              onClick={() => switchMode('login')}
              className="text-[#A89882] ml-2 cursor-pointer hover:text-white transition-colors border-b border-[#A89882]/30 pb-0.5"
            >
              返回登入
            </span>
          </p>
        ) : (
          <p className="text-white/50 text-xs tracking-wider">
            {mode === 'login' ? '尚未註冊？' : '已有專屬帳戶？'}
            <span
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-[#A89882] ml-2 cursor-pointer hover:text-white transition-colors border-b border-[#A89882]/30 pb-0.5"
            >
              {mode === 'login' ? '建立專屬命盤' : '立即登入'}
            </span>
          </p>
        )}
      </div>
      <p className="mt-7 text-center text-[11px] font-light leading-6 tracking-wide text-white/35">
        繼續使用代表你同意
        <Link className="mx-1 text-[#A89882]/80" to="/terms">服務條款</Link>
        與
        <Link className="ml-1 text-[#A89882]/80" to="/privacy">隱私政策</Link>
      </p>
    </div>
  );
}
