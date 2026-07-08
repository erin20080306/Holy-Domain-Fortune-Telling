import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { PLAN_DISPLAY } from '@shared/plans';
import { shouldShowPaypalLinks, type Platform } from '@shared/paypalVisibility';
import { USER_MESSAGES } from '@shared/productCopy';
import { clientEnv, PAYPAL_LINKS } from '../lib/env';
import { isStandalone } from '../pwa/pwaInstallPrompt';
import { useAuth } from '../state/AuthContext';

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
      <div className="glass-card mt-8">
        <p className="muted" style={{ margin: 0 }}>
          {USER_MESSAGES.paymentPending}
        </p>
      </div>
    </div>
  );
}
