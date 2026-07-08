import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  applyPerfClass,
  getPerfPreference,
  isLowPerformance,
  setPerfPreference,
  type PerfPreference,
} from '../lib/device/performanceMode';

// 設定 → 顯示與效能 → 省電流暢模式 (自動 / 開啟 / 關閉，預設自動)
export function SettingsScreen() {
  const nav = useNavigate();
  const [pref, setPref] = useState<PerfPreference>(getPerfPreference());
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

  return (
    <div className="app-shell">
      <h1 className="brand-title" style={{ fontSize: 32 }}>
        設定
      </h1>
      <p className="brand-sub">顯示與效能</p>

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

      <div className="spacer" />
      <button className="btn ghost" onClick={() => nav('/app')}>
        返回
      </button>
    </div>
  );
}
