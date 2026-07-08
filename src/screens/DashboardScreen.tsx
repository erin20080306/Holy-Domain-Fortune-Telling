import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { FORTUNE_CATEGORIES } from '@shared/categories';
import { PLAN_LABEL, type PlanId } from '@shared/plans';
import { useAuth } from '../state/AuthContext';
import { api } from '../lib/api';

export function DashboardScreen() {
  const nav = useNavigate();
  const { subscription, isAdmin } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const plan = (subscription?.plan ?? 'free') as PlanId;

  const draw = async (usageType: string) => {
    setBusy(true);
    setResult('');
    const res = await api.generate(usageType);
    setBusy(false);
    if (res?.ok) {
      setResult(res.content);
    } else {
      setResult(res?.message ?? '目前服務暫時無法使用，請稍後再試。');
    }
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      <div className="mb-10 text-center md:text-left">
        <p className="text-[#A89882] text-[10px] tracking-[0.3em] font-semibold mb-3 flex flex-col md:flex-row items-center md:items-start gap-2">
          <span>命理典藏</span>
          <span className="opacity-60">DESTINY COLLECTION</span>
        </p>
        <h2 className="text-3xl md:text-4xl font-extralight text-white tracking-widest mb-2 font-serif flex flex-col md:flex-row items-center md:items-end gap-3">
          選擇語言
          <span className="text-xs text-white/30 font-sans tracking-[0.2em] mb-1">SELECT METHOD</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {FORTUNE_CATEGORIES.map((cat) => {
          const Icon = (Icons as any)[cat.icon] ?? Icons.Sparkles;
          const usageType = cat.id === 'tarot' ? 'tarot' : 'short_reading';
          return (
            <div
              key={cat.id}
              onClick={() => {
                setSelected(cat.id);
                void draw(usageType);
              }}
              className="group relative overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 p-5 cursor-pointer hover:border-[#A89882]/30 transition-all duration-500 hover:bg-white/[0.05] flex flex-col justify-between aspect-[4/3] md:aspect-square"
              style={{ opacity: busy && selected === cat.id ? 0.6 : 1 }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#A89882]/5 rounded-full blur-2xl group-hover:bg-[#A89882]/10 transition-colors duration-500"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center group-hover:border-[#A89882]/30 transition-colors duration-500">
                  <Icon size={18} className="text-[#A89882] group-hover:text-amber-300 transition-colors duration-500" strokeWidth={1.5} />
                </div>
                <Icons.ArrowRight size={14} className="text-white/20 group-hover:text-[#A89882] -rotate-45 transition-all duration-500" />
              </div>
              <div className="relative z-10 mt-auto">
                <h3 className="text-base font-light text-slate-100 tracking-widest mb-1">{cat.name}</h3>
                <p className="text-[8px] text-[#A89882]/80 font-semibold tracking-[0.1em]">{cat.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {result && (
        <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-[2rem] p-6 md:p-8 relative overflow-hidden mt-8">
          <div className="absolute top-0 left-8 w-px h-6 bg-gradient-to-b from-[#A89882]/80 to-transparent"></div>
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-3">
            <Icons.Info size={14} className="text-[#A89882]" />
            <span className="text-xs text-[#A89882] tracking-widest">嚮導解讀</span>
            <span className="text-[9px] text-[#A89882]/50 tracking-widest mt-0.5">INTERPRETATION</span>
          </div>
          <div className="space-y-4">
            {result.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="text-slate-300/90 leading-relaxed tracking-widest text-sm font-light text-justify">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-white/10 pt-8">
        <button
          className="w-full sm:w-auto px-8 py-4 bg-[#A89882] text-[#050508] font-medium tracking-[0.2em] rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(168,152,130,0.3)] flex justify-center items-center gap-3 group"
          onClick={() => nav('/plans')}
        >
          升級方案
          <span className="text-[10px] opacity-70 border-l border-black/20 pl-3">目前方案：{PLAN_LABEL[plan]}</span>
          <Icons.ArrowRight size={16} className="group-hover:translate-x-1 transition-transform ml-1" />
        </button>
        <div className="flex gap-4">
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
    </div>
  );
}
