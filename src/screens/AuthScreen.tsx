import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '../state/AuthContext';

const ADMIN_EMAIL = 'erin20080306@gmail.com';
const ADMIN_PASSWORD = 'superadmin';

export function AuthScreen() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(
    params.get('mode') === 'login' ? 'login' : 'register',
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const validPhone = (v: string) => /^[+()\-\s\d]{7,20}$/.test(v);

  const submit = async () => {
    setError('');
    if (!email || !password) return setError('請輸入 email 與密碼。');
    if (mode === 'register') {
      if (!name) return setError('請輸入姓名。');
      if (!validPhone(phone)) return setError('電話格式不正確。');
      if (password.length < 8) return setError('密碼至少需 8 碼。');
    }
    setBusy(true);

    // Admin login check
    if (mode === 'login' && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setBusy(false);
      nav('/admin');
      return;
    }

    const res =
      mode === 'login'
        ? await signIn(email, password)
        : await signUp({ name, email, phone, password });
    setBusy(false);
    if (res.error) return setError(res.error);
    nav('/app');
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-[fadeIn_0.5s_ease-out]">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif text-white tracking-widest mb-2">
          {mode === 'login' ? '登入星域' : '註冊命盤'}
        </h2>
        <p className="text-[#A89882] text-xs tracking-[0.3em] uppercase">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
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

        {error && (
          <p style={{ color: '#e0a97a', fontSize: 14, margin: '4px 0 12px' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-4 mt-8 bg-[#A89882] text-[#050508] font-medium tracking-[0.2em] rounded-full hover:bg-white transition-colors flex justify-center items-center gap-2"
        >
          {busy ? '處理中…' : mode === 'login' ? '確認登入' : '完成註冊'}
          <ArrowRight size={16} />
        </button>
      </form>
      <div className="mt-8 text-center">
        <p className="text-white/50 text-xs tracking-wider">
          {mode === 'login' ? '尚未註冊？' : '已有專屬帳戶？'}
          <span
            onClick={() => {
              setError('');
              setMode(mode === 'login' ? 'register' : 'login');
            }}
            className="text-[#A89882] ml-2 cursor-pointer hover:text-white transition-colors border-b border-[#A89882]/30 pb-0.5"
          >
            {mode === 'login' ? '建立專屬命盤' : '立即登入'}
          </span>
        </p>
      </div>
    </div>
  );
}
