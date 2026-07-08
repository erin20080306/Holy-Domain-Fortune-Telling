import { useState } from 'react';
import {
  applyPerfClass,
  getPerfPreference,
  isLowPerformance,
  setPerfPreference,
  type PerfPreference,
} from '../lib/device/performanceMode';

export function SettingsScreen() {
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
    </div>
  );
}
