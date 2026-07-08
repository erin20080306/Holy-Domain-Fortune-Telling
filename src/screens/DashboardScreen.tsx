import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { FORTUNE_CATEGORIES } from '@shared/categories';
import { PRODUCT_NAMES } from '@shared/productCopy';
import { PLAN_LABEL, type PlanId } from '@shared/plans';
import { useAuth } from '../state/AuthContext';
import { api } from '../lib/api';

// 核心數據中心 (使用者版). Shows the 12 categories and produces readings via the
// backend, which enforces quota. Product-facing names only - never model names.
export function DashboardScreen() {
  const nav = useNavigate();
  const { subscription, isAdmin, signOut } = useAuth();
  const [usage, setUsage] = useState<any>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const plan = (subscription?.plan ?? 'free') as PlanId;

  useEffect(() => {
    void api.getUsage().then((r) => r?.ok && setUsage(r.usage));
  }, []);

  const draw = async (usageType: string) => {
    setBusy(true);
    setResult('');
    const res = await api.generate(usageType);
    setBusy(false);
    if (res?.ok) {
      setResult(res.content);
      void api.getUsage().then((r) => r?.ok && setUsage(r.usage));
    } else {
      setResult(res?.message ?? '目前服務暫時無法使用，請稍後再試。');
    }
  };

  return (
    <div className="app-shell">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="brand-title" style={{ fontSize: 34, margin: 0 }}>
          MYSTIC
        </h1>
        <button className="btn ghost" style={{ width: 'auto' }} onClick={() => void signOut()}>
          登出
        </button>
      </div>
      <p className="brand-sub" style={{ marginBottom: 16 }}>
        目前方案：{PLAN_LABEL[plan]}
      </p>

      <div className="glass-card" style={{ marginBottom: 18 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="muted">{PRODUCT_NAMES.shortReading}本月剩餘</div>
            <div style={{ fontSize: 22, color: 'var(--gold-bright)' }}>
              {usage
                ? Math.max(0, usage.short_reading.limit - usage.short_reading.used)
                : '—'}
            </div>
          </div>
          <button className="btn" style={{ width: 'auto' }} onClick={() => nav('/plans')}>
            升級方案
          </button>
        </div>
      </div>

      {result && (
        <div className="glass-card" style={{ marginBottom: 18 }}>
          <h4 style={{ marginTop: 0, color: 'var(--gold-bright)' }}>
            {PRODUCT_NAMES.dailyGuidance}
          </h4>
          <p className="muted" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {result}
          </p>
        </div>
      )}

      <div className="grid-cats">
        {FORTUNE_CATEGORIES.map((cat) => {
          const Icon = (Icons as any)[cat.icon] ?? Icons.Sparkles;
          const usageType = cat.id === 'tarot' ? 'tarot' : 'short_reading';
          return (
            <button
              key={cat.id}
              className="cat-card"
              disabled={busy}
              onClick={() => {
                setSelected(cat.id);
                void draw(usageType);
              }}
              style={{ textAlign: 'left', opacity: busy && selected === cat.id ? 0.6 : 1 }}
            >
              <Icon className="cat-icon" size={26} />
              <h4>{cat.name}</h4>
              <p>{cat.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="section-title">深度服務</div>
      <div className="glass-card">
        <h4 style={{ marginTop: 0 }}>{PRODUCT_NAMES.premiumAnalysis}</h4>
        <p className="muted">{PRODUCT_NAMES.premiumReport}，訂閱後即可使用。</p>
        <button
          className="btn"
          disabled={busy}
          onClick={() => void draw('premium_report')}
        >
          產生深度命理報告
        </button>
      </div>

      <div className="spacer" />
      <div className="row" style={{ gap: 10 }}>
        <button className="btn ghost" onClick={() => nav('/settings')}>
          設定
        </button>
        {isAdmin && (
          <button className="btn ghost" onClick={() => nav('/admin')}>
            核心數據中心
          </button>
        )}
      </div>
    </div>
  );
}
