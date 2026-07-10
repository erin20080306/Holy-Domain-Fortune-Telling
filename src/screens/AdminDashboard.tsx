import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLAN_LABEL, type PlanId } from '@shared/plans';
import { api } from '../lib/api';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'manual_active']);

function isUserSubscribed(user: any): boolean {
  return user?.plan !== 'free' && ACTIVE_SUBSCRIPTION_STATUSES.has(user?.status);
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

      <div className="section-title">註冊者列表</div>
      <div className="glass-card">
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <input
            className="field"
            style={{ margin: 0 }}
            placeholder="搜尋 email / 姓名 / 電話"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="field"
            style={{ margin: 0, width: 140 }}
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="">全部方案</option>
            <option value="free">見習星辰</option>
            <option value="pro_monthly">星河行者</option>
            <option value="master_monthly">宇宙共鳴</option>
          </select>
          <button className="btn" style={{ width: 'auto' }} onClick={() => void load()}>
            搜尋
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>註冊日期</th>
                <th>名稱</th>
                <th>Email</th>
                <th>電話</th>
                <th>方案</th>
                <th>訂閱</th>
                <th>來源</th>
                <th>狀態</th>
                <th>短解讀</th>
                <th>報告</th>
                <th>登入</th>
                <th>最後登入</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td>{(u.created_at ?? '').slice(0, 10)}</td>
                  <td>{u.display_name ?? '—'}</td>
                  <td>{u.email}</td>
                  <td>{u.phone ?? '—'}</td>
                  <td>{PLAN_LABEL[(u.plan ?? 'free') as PlanId]}</td>
                  <td>{isUserSubscribed(u) ? '已訂閱' : '未訂閱'}</td>
                  <td>{u.source}</td>
                  <td>{u.status}</td>
                  <td>{u.short_reading_used}</td>
                  <td>{u.premium_report_used}</td>
                  <td>{u.login_count}</td>
                  <td>{(u.last_login_at ?? '').slice(0, 16).replace('T', ' ')}</td>
                  <td>
                    <button
                      className="btn ghost"
                      style={{ width: 'auto', padding: '6px 12px' }}
                      onClick={() => setEditing(u)}
                    >
                      開通/修改
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    } else {
      setPlan('free');
      setStatus('none');
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
    }
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
      <div className="glass-card" style={{ maxWidth: 420, width: '100%' }}>
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
            setSubscribed(ACTIVE_SUBSCRIPTION_STATUSES.has(e.target.value));
          }}
        >
          {['none', 'pending', 'active', 'manual_active', 'cancelled', 'expired', 'suspended'].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ),
          )}
        </select>
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
