import { useNavigate } from 'react-router-dom';
import { PLAN_DISPLAY } from '@shared/plans';
import { shouldShowPaypalLinks, type Platform } from '@shared/paypalVisibility';
import { USER_MESSAGES } from '@shared/productCopy';
import { clientEnv, PAYPAL_LINKS } from '../lib/env';
import { isStandalone } from '../pwa/pwaInstallPrompt';
import { useAuth } from '../state/AuthContext';

// Detects the runtime platform. Capacitor native builds set a global flag;
// otherwise we're web/pwa. iOS Safari "Add to Home Screen" counts as web/pwa.
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
    <div className="app-shell">
      <h1 className="brand-title" style={{ fontSize: 40 }}>
        選擇方案
      </h1>
      <p className="brand-sub">開啟你的命理旅程</p>

      {PLAN_DISPLAY.map((plan) => (
        <div className="glass-card plan-card" key={plan.id}>
          <h3>{plan.title}</h3>
          <div className="plan-price">{plan.price}</div>
          <ul className="plan-features">
            {plan.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>

          {plan.id === 'free' ? (
            <button
              className="btn"
              onClick={() => nav(session ? '/app' : '/auth?mode=register')}
            >
              {plan.buttonText}
            </button>
          ) : showPaypal ? (
            <a
              className="btn"
              href={linkFor(plan.id)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                // A click NEVER activates the plan. Backend pending record +
                // webhook / admin match is the only activation path.
              }}
            >
              {plan.buttonText}
            </a>
          ) : (
            <button className="btn ghost" disabled>
              訂閱功能準備中
            </button>
          )}
        </div>
      ))}

      <div className="glass-card">
        <p className="muted" style={{ margin: 0 }}>
          {USER_MESSAGES.paymentPending}
        </p>
      </div>
    </div>
  );
}
