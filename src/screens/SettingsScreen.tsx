import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FileText, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  applyPerfClass,
  getPerfPreference,
  isLowPerformance,
  setPerfPreference,
  type PerfPreference,
} from '../lib/device/performanceMode';
import { useAuth } from '../state/AuthContext';
import { api } from '../lib/api';

export function SettingsScreen() {
  const nav = useNavigate();
  const { verifyPassword, signOut } = useAuth();
  const [pref, setPref] = useState<PerfPreference>(getPerfPreference());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const low = isLowPerformance(pref);

  const choose = (p: PerfPreference) => {
    setPref(p);
    setPerfPreference(p);
    applyPerfClass(p);
  };

  const options: { value: PerfPreference; label: string }[] = [
    { value: 'auto', label: '自動' },
    { value: 'on', label: '開啟' },
    { value: 'off', label: '關閉' },
  ];

  const deleteAccount = async () => {
    if (deletePhrase !== '刪除帳號') return setDeleteError('請輸入「刪除帳號」完成確認。');
    setDeleteBusy(true);
    setDeleteError('');
    const verified = await verifyPassword(deletePassword);
    if (verified.error) {
      setDeleteError(verified.error);
      setDeleteBusy(false);
      return;
    }

    const response = await api.deleteAccount();
    if (!response?.ok) {
      setDeleteError(response?.message ?? '目前無法刪除帳號，請稍後再試。');
      setDeleteBusy(false);
      return;
    }

    await signOut();
    nav('/');
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-[fadeIn_0.5s_ease-out]">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-serif text-white tracking-widest mb-2">設定</h2>
        <p className="text-[#A89882] text-xs tracking-[0.3em] uppercase">SETTINGS</p>
      </div>
      <div className="glass-card">
        <h4 style={{ marginTop: 0 }}>省電流暢模式</h4>
        <p className="muted">
          舊手機或弱網路可開啟此模式，關閉大型背景動畫與模糊效果，讓載入更順暢。
        </p>
        <div className="row" style={{ gap: 10 }}>
          {options.map((o) => (
            <button
              key={o.value}
              className={pref === o.value ? 'btn' : 'btn ghost'}
              onClick={() => choose(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          目前狀態：{low ? '低效能模式（動畫已關閉）' : '一般模式'}
        </p>
      </div>
      <div className="glass-card mt-5">
        <div className="mb-3 flex items-center gap-2 text-[#A89882]">
          <ShieldCheck size={17} />
          <h4 className="m-0">隱私與條款</h4>
        </div>
        <p className="muted">查看資料使用方式、命理解讀限制、方案付款與帳號規範。</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button className="btn ghost" onClick={() => nav('/privacy')}>
            <ShieldCheck size={15} />
            隱私政策
          </button>
          <button className="btn ghost" onClick={() => nav('/terms')}>
            <FileText size={15} />
            服務條款
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-rose-300/20 bg-rose-300/[0.035] p-5">
        <div className="mb-2 flex items-center gap-2 text-rose-200">
          <Trash2 size={17} />
          <h4 className="m-0">刪除帳號與命盤資料</h4>
        </div>
        <p className="muted">
          刪除後無法復原。若仍有 PayPal 訂閱，必須先完成取消與付款確認。
        </p>
        <button
          type="button"
          className="w-full rounded-full border border-rose-300/35 px-5 py-3 text-sm tracking-widest text-rose-200 hover:bg-rose-200 hover:text-black"
          onClick={() => setDeleteOpen(true)}
        >
          刪除帳號
        </button>
      </div>

      {deleteOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            role="presentation"
            onClick={() => !deleteBusy && setDeleteOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-t-3xl border border-rose-300/25 bg-[#0b0b10] p-5 pb-[calc(var(--safe-bottom)+20px)] sm:rounded-3xl sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-label="刪除帳號確認"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-rose-200/70">DELETE ACCOUNT</p>
                  <h3 className="mt-2 text-xl font-light tracking-widest text-white">永久刪除帳號</h3>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleteBusy}
                  aria-label="關閉刪除帳號視窗"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mt-4 text-sm font-light leading-7 text-slate-300">
                系統會刪除帳戶、出生資料與歷史報告。請輸入目前密碼，並在第二欄輸入「刪除帳號」。
              </p>
              <div className="mt-5 space-y-4">
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  placeholder="目前密碼"
                  className="field m-0"
                />
                <input
                  type="text"
                  value={deletePhrase}
                  onChange={(event) => setDeletePhrase(event.target.value)}
                  placeholder="輸入：刪除帳號"
                  className="field m-0"
                />
              </div>
              {deleteError && <p className="mt-4 text-sm leading-6 text-[#e0a97a]">{deleteError}</p>}
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={deleteBusy || !deletePassword || deletePhrase !== '刪除帳號'}
                className="mt-5 w-full rounded-full bg-rose-200 px-5 py-3.5 font-medium tracking-widest text-black disabled:opacity-40"
              >
                {deleteBusy ? '刪除處理中…' : '永久刪除'}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
