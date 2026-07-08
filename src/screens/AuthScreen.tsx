import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

// 登入星域 / 註冊命盤. Uses real Supabase Auth via AuthContext (no fake state,
// no hardcoded admin). Phone is validated by format.
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
    const res =
      mode === 'login'
        ? await signIn(email, password)
        : await signUp({ name, email, phone, password });
    setBusy(false);
    if (res.error) return setError(res.error);
    nav('/app');
  };

  return (
    <div className="app-shell">
      <h1 className="brand-title">MYSTIC</h1>
      <p className="brand-sub">{mode === 'login' ? '登入星域' : '註冊命盤'}</p>

      <div className="glass-card">
        {mode === 'register' && (
          <>
            <label className="label">姓名</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </>
        )}
        <label className="label">Email</label>
        <input
          className="field"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        {mode === 'register' && (
          <>
            <label className="label">電話</label>
            <input
              className="field"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </>
        )}
        <label className="label">密碼</label>
        <input
          className="field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {error && (
          <p style={{ color: '#e0a97a', fontSize: 14, margin: '4px 0 12px' }}>{error}</p>
        )}

        <button className="btn" disabled={busy} onClick={() => void submit()}>
          {busy ? '處理中…' : mode === 'login' ? '登入星域' : '建立命盤'}
        </button>
        <div className="spacer" />
        <button
          className="btn ghost"
          onClick={() => {
            setError('');
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        >
          {mode === 'login' ? '還沒有帳號？註冊命盤' : '已有帳號？登入星域'}
        </button>
      </div>
    </div>
  );
}
