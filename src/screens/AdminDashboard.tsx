import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLAN_LABEL, type PlanId } from '@shared/plans';
import { api } from '../lib/api';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'manual_active']);
const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  none: '未訂閱',
  pending: '付款確認中',
  active: '已付款訂閱',
  manual_active: '後台手動開通',
  cancelled: '已取消',
  expired: '已到期',
  suspended: '已暫停',
};

const SUBSCRIPTION_STATUS_HELP: Record<string, string> = {
  none: '沒有付費權限，視為免費會員。',
  pending: '付款或資料確認中，暫不視為已訂閱。',
  active: '由付款流程啟用的有效訂閱。',
  manual_active: '管理員在後台手動開通，通常用於補單、測試或人工授權。',
  cancelled: '會員或系統已取消訂閱，暫不視為有效訂閱。',
  expired: '訂閱已過期，暫不視為有效訂閱。',
  suspended: '訂閱暫停中，暫不視為有效訂閱。',
};

const SUBSCRIPTION_SOURCE_LABEL: Record<string, string> = {
  free: '免費',
  paypal: 'PayPal',
  apple_iap: 'Apple 內購',
  google_play: 'Google Play',
  admin_manual: '後台手動',
};

const SUBSCRIPTION_STATUS_OPTIONS = [
  'none',
  'pending',
  'active',
  'manual_active',
  'cancelled',
  'expired',
  'suspended',
];

function formatStatusLabel(status: string | null | undefined): string {
  if (!status) return '未訂閱（none）';
  return `${SUBSCRIPTION_STATUS_LABEL[status] ?? status}（${status}）`;
}

function formatSourceLabel(source: string | null | undefined): string {
  if (!source) return '免費（free）';
  return `${SUBSCRIPTION_SOURCE_LABEL[source] ?? source}（${source}）`;
}

function isUserSubscribed(user: any): boolean {
  if (user?.plan === 'free' || !ACTIVE_SUBSCRIPTION_STATUSES.has(user?.status)) return false;
  if (!user?.current_period_end) return true;
  const expiresAt = Date.parse(user.current_period_end);
  return !Number.isFinite(expiresAt) || expiresAt > Date.now();
}

function formatTaipeiDate(value: string | null | undefined): string {
  if (!value) return '無到期日';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function isoToTaipeiDateInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function taipeiEndOfDayIso(dateInput: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return null;
  const date = new Date(`${dateInput}T23:59:59+08:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function addDaysToPeriodEnd(currentDateInput: string, days: number): string {
  const currentIso = currentDateInput ? taipeiEndOfDayIso(currentDateInput) : null;
  const current = currentIso ? new Date(currentIso) : null;
  const base =
    current && current.getTime() > Date.now()
      ? current
      : new Date(`${isoToTaipeiDateInput(new Date().toISOString())}T23:59:59+08:00`);
  const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return isoToTaipeiDateInput(next.toISOString());
}

export function AdminDashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [forbidden, setForbidden] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    const s = await api.admin.stats();
    if (!s?.ok) return setForbidden(true);
    setStats(s);
    const u = await api.admin.users({
      page: String(page),
      pageSize: '20',
      search,
      plan: planFilter,
    });
    if (u?.ok) {
      setUsers(u.users);
      setTotal(u.total);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (forbidden) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="glass-card">
          <p className="muted">此區僅限管理員存取。</p>
          <button className="btn ghost" onClick={() => nav('/app')}>
            返回
          </button>
        </div>
      </div>
    );
  }

  const kpi = (num: any, lbl: string) => (
    <div className="stat" key={lbl}>
      <div className="num">{num ?? '—'}</div>
      <div className="lbl">{lbl}</div>
    </div>
  );

  return (
    <div className="w-full" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="brand-title" style={{ fontSize: 30, margin: 0 }}>
          核心數據中心
        </h1>
        <button className="btn ghost" style={{ width: 'auto' }} onClick={() => nav('/app')}>
          進入功能區
        </button>
      </div>
      <div className="spacer" />

      <div className="stat-grid">
        {kpi(stats?.total_users, '總註冊帳號')}
        {kpi(stats?.today_new_users, '今日新增')}
        {kpi(stats?.subscribed_users, '訂閱人數')}
        {kpi(stats?.pending_paypal_match, '待人工確認付款')}
        {kpi(stats?.today_logins, '今日登入人數')}
        {kpi(stats?.total_logins, '總登入次數')}
        {kpi(stats?.short_reading_used, '命理短解讀使用')}
        {kpi(stats?.premium_report_used, '深度報告使用')}
        {kpi(stats?.plan_counts?.free, '見習星辰')}
        {kpi(stats?.plan_counts?.pro_monthly, '星河行者')}
        {kpi(stats?.plan_counts?.master_monthly, '宇宙共鳴')}
        {kpi(`$${stats?.estimated_cost_usd ?? 0}`, '預估成本 (USD)')}
      </div>

      <div className="section-title">會員訂閱管理</div>
      <div className="glass-card">
        <p className="muted" style={{ marginTop: 0 }}>
          選擇會員後可手動開通訂閱、調整方案與增加到期時間。若找不到會員，先用下方搜尋 email / 姓名 / 電話。
        </p>
        <div className="row" style={{ gap: 8, alignItems: 'stretch', flexWrap: 'wrap' }}>
          <select
            className="field"
            style={{ margin: 0, minWidth: 220, flex: 1 }}
            value={editing?.user_id ?? ''}
            onChange={(e) => {
              const user = users.find((u) => u.user_id === e.target.value);
              if (user) setEditing(user);
            }}
          >
            <option value="">選擇目前列表會員</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.email}｜{PLAN_LABEL[(u.plan ?? 'free') as PlanId]}｜{formatTaipeiDate(u.current_period_end)}
              </option>
            ))}
          </select>
          <button
            className="btn"
            style={{ width: 'auto', whiteSpace: 'nowrap' }}
            disabled={!editing}
            onClick={() => editing && setEditing(editing)}
          >
            編輯訂閱
          </button>
        </div>
      </div>

      <div className="section-title">註冊者列表</div>
      <div className="glass-card">
        <div className="row" style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            className="field"
            style={{ margin: 0, minWidth: 220, flex: 1 }}
            placeholder="搜尋 email / 姓名 / 電話"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="field"
            style={{ margin: 0, width: 150 }}
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="">全部方案</option>
            <option value="free">見習星辰</option>
            <option value="pro_monthly">星河行者</option>
            <option value="master_monthly">宇宙共鳴</option>
          </select>
          <button
            className="btn"
            style={{ width: 'auto', minWidth: 92, whiteSpace: 'nowrap' }}
            onClick={() => void load()}
          >
            搜尋
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {users.map((u) => (
            <div
              key={u.user_id}
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 18,
                padding: 14,
                background: 'rgba(255,255,255,0.025)',
              }}
            >
              <div
                className="row"
                style={{
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: 16, wordBreak: 'break-word' }}>
                    {u.display_name ?? '未填姓名'}
                  </div>
                  <div className="muted" style={{ fontSize: 13, wordBreak: 'break-all', marginTop: 4 }}>
                    {u.email}
                  </div>
                </div>
                <button
                  className="btn"
                  style={{ width: 'auto', minWidth: 112, padding: '10px 14px', whiteSpace: 'nowrap' }}
                  onClick={() => setEditing(u)}
                >
                  訂閱管理
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 10,
                }}
              >
                {[
                  ['註冊日期', (u.created_at ?? '').slice(0, 10)],
                  ['方案', PLAN_LABEL[(u.plan ?? 'free') as PlanId]],
                  ['訂閱', isUserSubscribed(u) ? '已訂閱' : '未訂閱'],
                  ['到期日', formatTaipeiDate(u.current_period_end)],
                  ['狀態', formatStatusLabel(u.status)],
                  ['來源', formatSourceLabel(u.source)],
                  ['電話', u.phone ?? '—'],
                  ['短解讀', String(u.short_reading_used ?? 0)],
                  ['報告', String(u.premium_report_used ?? 0)],
                  ['登入', String(u.login_count ?? 0)],
                  ['最後登入', (u.last_login_at ?? '').slice(0, 16).replace('T', ' ') || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 3 }}>
                      {label}
                    </div>
                    <div style={{ color: '#e8e2d8', fontSize: 14, wordBreak: 'break-word' }}>
                      {value || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <button
            className="btn ghost"
            style={{ width: 'auto' }}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一頁
          </button>
          <span className="muted">
            第 {page} 頁 / 共 {Math.max(1, Math.ceil(total / 20))} 頁
          </span>
          <button
            className="btn ghost"
            style={{ width: 'auto' }}
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
          >
            下一頁
          </button>
        </div>
      </div>

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      <div className="spacer" />
      <button className="btn ghost" onClick={() => nav('/admin/audit')}>
        查看操作紀錄 (Audit Log)
      </button>
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [plan, setPlan] = useState<PlanId>((user.plan ?? 'free') as PlanId);
  const [status, setStatus] = useState(user.status ?? 'none');
  const [subscribed, setSubscribed] = useState(isUserSubscribed(user));
  const [periodEndDate, setPeriodEndDate] = useState(isoToTaipeiDateInput(user.current_period_end));
  const [note, setNote] = useState('');
  const [resetUsage, setResetUsage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  const save = async () => {
    setBusy(true);
    await api.admin.updateSubscription(user.user_id, {
      plan: subscribed ? (plan === 'free' ? 'pro_monthly' : plan) : 'free',
      status: subscribed ? status : 'none',
      current_period_end: subscribed && periodEndDate ? taipeiEndOfDayIso(periodEndDate) : null,
      admin_note: note,
      reset_month_usage: resetUsage,
    });
    setBusy(false);
    onSaved();
  };

  const sendReset = async () => {
    setPwMsg('');
    setPwBusy(true);
    const res = await api.admin.sendPasswordReset(user.user_id);
    setPwBusy(false);
    setPwMsg(res?.ok ? '已寄出密碼重設信給該使用者。' : res?.message ?? '寄送失敗，請稍後再試。');
  };

  const updateSubscribed = (checked: boolean) => {
    setSubscribed(checked);
    if (checked) {
      setPlan((current) => (current === 'free' ? 'pro_monthly' : current));
      setStatus('manual_active');
      setPeriodEndDate((current) => current || addDaysToPeriodEnd('', 30));
    } else {
      setPlan('free');
      setStatus('none');
      setPeriodEndDate('');
    }
  };

  const updatePlan = (nextPlan: PlanId) => {
    setPlan(nextPlan);
    if (nextPlan === 'free') {
      setSubscribed(false);
      setStatus('none');
    } else {
      setSubscribed(true);
      if (!ACTIVE_SUBSCRIPTION_STATUSES.has(status)) setStatus('manual_active');
      setPeriodEndDate((current) => current || addDaysToPeriodEnd('', 30));
    }
  };

  const extendPeriod = (days: number) => {
    if (!subscribed) updateSubscribed(true);
    setPeriodEndDate((current) => addDaysToPeriodEnd(current, days));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        zIndex: 60,
      }}
    >
      <div
        className="glass-card"
        style={{
          maxWidth: 460,
          width: '100%',
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto',
        }}
      >
        <h3 style={{ marginTop: 0 }}>會員訂閱開通：{user.email}</h3>
        <label className="row" style={{ gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
          <input
            type="checkbox"
            checked={subscribed}
            onChange={(e) => updateSubscribed(e.target.checked)}
            style={{ width: 'auto', marginTop: 4 }}
          />
          <span>
            <span style={{ display: 'block', color: '#fff', letterSpacing: '0.08em' }}>此會員已訂閱</span>
            <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
              開啟後會以後台手動方式開通；關閉則改回免費方案。
            </span>
          </span>
        </label>

        <label className="label">訂閱方案</label>
        <select className="field" value={plan} onChange={(e) => updatePlan(e.target.value as PlanId)}>
          <option value="free">見習星辰 (free)</option>
          <option value="pro_monthly">星河行者 (pro_monthly)</option>
          <option value="master_monthly">宇宙共鳴 (master_monthly)</option>
        </select>

        <label className="label">訂閱狀態</label>
        <select
          className="field"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            const active = ACTIVE_SUBSCRIPTION_STATUSES.has(e.target.value);
            setSubscribed(active);
            if (active) setPeriodEndDate((current) => current || addDaysToPeriodEnd('', 30));
          }}
        >
          {SUBSCRIPTION_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {formatStatusLabel(s)}
            </option>
          ))}
        </select>
        <p className="muted" style={{ marginTop: -8, fontSize: 12 }}>
          {SUBSCRIPTION_STATUS_HELP[status] ?? '請依實際訂閱狀態選擇。'}
        </p>

        <label className="label">訂閱到期日</label>
        <input
          className="field"
          type="date"
          value={periodEndDate}
          disabled={!subscribed}
          onChange={(e) => setPeriodEndDate(e.target.value)}
        />
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {[30, 90, 365].map((days) => (
            <button
              key={days}
              className="btn ghost"
              style={{ width: 'auto', padding: '8px 12px' }}
              type="button"
              onClick={() => extendPeriod(days)}
            >
              +{days === 365 ? '1年' : `${days}天`}
            </button>
          ))}
          <button
            className="btn ghost"
            style={{ width: 'auto', padding: '8px 12px' }}
            type="button"
            disabled={!subscribed}
            onClick={() => setPeriodEndDate('')}
          >
            不設到期
          </button>
        </div>
        <p className="muted" style={{ marginTop: -4, fontSize: 12 }}>
          到期日以台灣時間當日 23:59:59 為準；留空表示手動開通不限期。
        </p>
        <label className="label">管理員備註</label>
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
        <label className="row" style={{ gap: 8, marginBottom: 14 }}>
          <input
            type="checkbox"
            checked={resetUsage}
            onChange={(e) => setResetUsage(e.target.checked)}
            style={{ width: 'auto' }}
          />
          <span className="muted">重置本月額度</span>
        </label>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" disabled={busy} onClick={() => void save()}>
            儲存
          </button>
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 16, paddingTop: 16 }}>
          <label className="label">密碼協助</label>
          <button
            className="btn ghost"
            style={{ width: '100%' }}
            disabled={pwBusy}
            onClick={() => void sendReset()}
          >
            {pwBusy ? '寄送中…' : '寄送密碼重設信給此使用者'}
          </button>
          {pwMsg && (
            <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              {pwMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
