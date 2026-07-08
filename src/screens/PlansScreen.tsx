import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Mail, Send } from 'lucide-react';
import { PLAN_DISPLAY } from '@shared/plans';
import { shouldShowPaypalLinks, type Platform } from '@shared/paypalVisibility';
import { USER_MESSAGES } from '@shared/productCopy';
import { clientEnv, PAYPAL_LINKS } from '../lib/env';
import { isStandalone } from '../pwa/pwaInstallPrompt';
import { useAuth } from '../state/AuthContext';
import { api } from '../lib/api';

function detectPlatform(): Platform {
  const cap = (window as any).Capacitor;
  if (cap?.getPlatform) {
    const p = cap.getPlatform();
    if (p === 'ios') return 'ios_app';
    if (p === 'android') return 'android_app';
  }
  return isStandalone() ? 'pwa' : 'web';
}

export function PlansScreen() {
  const nav = useNavigate();
  const { session } = useAuth();
  const platform = detectPlatform();

  const showPaypal = shouldShowPaypalLinks(platform, {
    paypalCheckoutEnabled: clientEnv.paypal.checkoutEnabled,
    webEnablePaypalLinks: clientEnv.paypal.webEnableLinks,
    iosHideExternalPaypal: clientEnv.paypal.iosHideExternal,
    androidHideExternalPaypal: clientEnv.paypal.androidHideExternal,
  });

  const linkFor = (planId: string) =>
    planId === 'pro_monthly' ? PAYPAL_LINKS.pro_monthly : PAYPAL_LINKS.master_monthly;

  return (
    <div className="w-full animate-[fadeIn_0.5s_ease-out]">
      <div className="text-center mb-10">
        <p className="text-[#A89882] text-[10px] tracking-[0.3em] font-semibold mb-2 flex justify-center gap-2 items-center">
          <span>解鎖命運</span>
          <span className="opacity-70">UNLOCK DESTINY</span>
        </p>
        <h2 className="text-3xl md:text-4xl font-extralight text-white tracking-widest font-serif">選擇方案</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {PLAN_DISPLAY.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white/[0.02] border border-white/10 rounded-3xl p-6 flex flex-col hover:border-[#A89882]/50 transition-colors ${
              plan.id === 'pro_monthly'
                ? 'bg-gradient-to-b from-[#A89882]/10 to-transparent border-[#A89882]/40 transform lg:-translate-y-4 shadow-[0_20px_40px_rgba(168,152,130,0.1)]'
                : ''
            }`}
          >
            {plan.id === 'pro_monthly' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#A89882] text-black text-[10px] tracking-[0.2em] font-bold px-4 py-1 rounded-full">
                POPULAR
              </div>
            )}
            <h3 className="text-lg text-white font-light tracking-widest mb-2">{plan.title}</h3>
            <p className="text-[#A89882] text-xs tracking-widest mb-6 uppercase">
              {plan.id === 'free' ? 'Free Tier' : plan.id === 'pro_monthly' ? 'Pro Tier' : 'Master Tier'}
            </p>
            <div className="text-3xl text-white font-serif mb-6 border-b border-white/5 pb-6">
              {plan.price}
              <span className="text-xs text-white/40 font-sans tracking-widest">
                {plan.id === 'free' ? ' / 永久' : ' / 月'}
              </span>
            </div>
            <ul className="space-y-4 mb-8 flex-1 text-sm text-slate-300 font-light tracking-widest">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-3 items-center">
                  <ChevronLeft size={12} className="text-[#A89882]" />
                  {f}
                </li>
              ))}
            </ul>
            {plan.id === 'free' ? (
              <button
                className="w-full py-3 rounded-full border border-white/20 text-white tracking-widest text-xs hover:bg-white hover:text-black transition-all"
                onClick={() => nav(session ? '/app' : '/auth?mode=register')}
              >
                {plan.buttonText}
              </button>
            ) : showPaypal ? (
              <a
                className="w-full py-3 rounded-full bg-[#A89882] text-black tracking-widest text-xs font-medium hover:bg-white transition-all shadow-[0_0_20px_rgba(168,152,130,0.3)] flex justify-center items-center gap-2"
                href={linkFor(plan.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {plan.buttonText}
                <ArrowRight size={14} />
              </a>
            ) : (
              <button className="w-full py-3 rounded-full border border-white/20 text-white tracking-widest text-xs hover:bg-white hover:text-black transition-all" disabled>
                訂閱功能準備中
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-8 max-w-5xl mx-auto border border-[#A89882]/20 rounded-3xl p-6 md:p-8 bg-white/[0.02]">
        <p className="text-[#A89882] text-[10px] tracking-[0.3em] font-semibold mb-2 flex gap-2 items-center">
          <span>深度命理報告內容</span>
          <span className="opacity-70">REPORT CONTENTS</span>
        </p>
        <p className="text-slate-400 text-xs font-light tracking-wider mb-5">
          每份約 3,000 字（約 2–3 頁 A4），依你選擇的命理項目與提供的資料撰寫，涵蓋以下五大面向：
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm text-slate-300 font-light tracking-wider">
          {['整體運勢總論', '事業／學業', '感情／人際', '財運', '近期（3 個月）重點提醒與行動建議'].map(
            (s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className="w-5 h-5 shrink-0 rounded-full border border-[#A89882]/40 text-[#A89882] text-[10px] flex items-center justify-center">
                  {i + 1}
                </span>
                {s}
              </li>
            ),
          )}
        </ul>
      </div>

      <div className="glass-card mt-8">
        <p className="muted" style={{ margin: 0 }}>
          {USER_MESSAGES.paymentPending}
        </p>
      </div>

      <ContactForm />
    </div>
  );
}

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !message.trim()) {
      return setError('請填寫姓名、Email 與訊息內容。');
    }
    setBusy(true);
    try {
      const res = await api.sendContact({ name, email, message });
      if (res.ok) {
        setStatus('ok');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        setStatus('error');
        setError(res.message ?? '寄送失敗，請稍後再試。');
      }
    } catch {
      setStatus('error');
      setError('寄送失敗，請檢查網路後再試。');
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full bg-transparent border-b border-white/20 px-1 py-3 text-white font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors placeholder-white/30 text-sm';

  return (
    <div className="mt-8 max-w-2xl mx-auto text-center border border-white/10 rounded-3xl p-8 bg-white/[0.02]">
      <p className="text-[#A89882] text-[10px] tracking-[0.3em] font-semibold mb-2 flex justify-center gap-2 items-center">
        <span>需要協助</span>
        <span className="opacity-70">NEED HELP</span>
      </p>
      <h3 className="text-xl text-white font-light tracking-widest mb-3 font-serif">聯絡客服</h3>
      <p className="text-slate-400 text-sm font-light tracking-wider mb-6">
        方案、付款或帳戶有任何問題，填寫下方表單送出，我們將盡快回覆您的信箱。
      </p>

      {status === 'ok' ? (
        <div className="flex flex-col items-center gap-3 py-6 animate-[fadeIn_0.4s_ease-out]">
          <Mail size={28} className="text-[#A89882]" />
          <p className="text-white tracking-wider">訊息已送出，我們會盡快與您聯繫。</p>
          <button
            onClick={() => setStatus('idle')}
            className="text-[#A89882] text-xs tracking-widest border-b border-[#A89882]/30 pb-0.5 hover:text-white transition-colors"
          >
            再寄一封
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-5 text-left"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="姓名 Name"
            className={inputCls}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="您的 Email（方便我們回覆）"
            className={inputCls}
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="想詢問的內容 Message"
            rows={4}
            className={`${inputCls} resize-none`}
          />

          {error && <p className="text-[#e0a97a] text-sm">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-full bg-[#A89882] text-black tracking-widest text-xs font-medium hover:bg-white transition-all shadow-[0_0_20px_rgba(168,152,130,0.3)] flex justify-center items-center gap-2 disabled:opacity-60"
          >
            {busy ? '寄送中…' : '送出訊息'}
            <Send size={14} />
          </button>
          <p className="text-white/30 text-[11px] tracking-wider text-center">
            或直接來信 erin20080306@gmail.com
          </p>
        </form>
      )}
    </div>
  );
}
