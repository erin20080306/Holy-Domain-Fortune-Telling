import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { FORTUNE_CATEGORIES } from '@shared/categories';
import { PLAN_LABEL, type PlanId } from '@shared/plans';
import { useAuth } from '../state/AuthContext';
import { api } from '../lib/api';

const NEEDS_BIRTH = new Set(['bazi', 'ziwei', 'zodiac', 'astro', 'numerology', 'humandesign']);
const NEEDS_NAME = new Set(['name']);

export function DashboardScreen() {
  const nav = useNavigate();
  const { subscription, isAdmin } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const [question, setQuestion] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const plan = (subscription?.plan ?? 'free') as PlanId;
  const selectedCat = FORTUNE_CATEGORIES.find((c) => c.id === selected) ?? null;

  const pick = (id: string) => {
    setSelected(id);
    setResult('');
  };

  // After choosing a method, smoothly scroll the input panel into view so the
  // user doesn't miss it below the long list of categories.
  useEffect(() => {
    if (selected) {
      const t = setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [selected]);

  const draw = async (usageType: string) => {
    if (!selectedCat) return;
    setBusy(true);
    setResult('');
    try {
      const res = await api.generate(usageType, {
        category: selectedCat.id,
        question: question.trim() || undefined,
        name: NEEDS_NAME.has(selectedCat.id) ? fullName.trim() || undefined : undefined,
        gender: gender || undefined,
        birth_date: NEEDS_BIRTH.has(selectedCat.id) ? birthDate || undefined : undefined,
        birth_time: NEEDS_BIRTH.has(selectedCat.id) ? birthTime || undefined : undefined,
      });
      if (res?.ok) {
        setResult(res.content);
      } else {
        const base = res?.message ?? '目前服務暫時無法使用，請稍後再試。';
        setResult(res?.debug ? `${base}\n\n[debug] ${res.debug}` : base);
      }
    } catch {
      setResult('目前服務暫時無法使用，請稍後再試。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <div className="animate-[fadeIn_0.5s_ease-out]">
      <div className="mb-10 text-center md:text-left">
        <p className="text-[#A89882] text-[10px] tracking-[0.3em] font-semibold mb-3 flex flex-col md:flex-row items-center md:items-start gap-2">
          <span>命理典藏</span>
          <span className="opacity-60">DESTINY COLLECTION</span>
        </p>
        <h2 className="text-3xl md:text-4xl font-extralight text-white tracking-widest mb-2 font-serif flex flex-col md:flex-row items-center md:items-end gap-3">
          選擇命理
          <span className="text-xs text-white/30 font-sans tracking-[0.2em] mb-1">SELECT METHOD</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {FORTUNE_CATEGORIES.map((cat) => {
          const Icon = (Icons as any)[cat.icon] ?? Icons.Sparkles;
          return (
            <div
              key={cat.id}
              onClick={() => pick(cat.id)}
              className={`group relative overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-white/[0.03] to-transparent border p-5 cursor-pointer transition-all duration-500 hover:bg-white/[0.05] flex flex-col justify-between aspect-[4/3] md:aspect-square ${
                selected === cat.id ? 'border-[#A89882]/60 bg-white/[0.05]' : 'border-white/5 hover:border-[#A89882]/30'
              }`}
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

      {selectedCat && (
        <div ref={panelRef} className="scroll-mt-6 md:scroll-mt-20 bg-white/[0.02] backdrop-blur-md border border-[#A89882]/20 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-8 mt-6 md:mt-8 animate-[fadeIn_0.4s_ease-out]">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-white tracking-widest font-light">{selectedCat.name}</span>
            <span className="text-[9px] text-[#A89882]/60 tracking-widest mt-0.5">{selectedCat.subtitle}</span>
          </div>
          <p className="text-slate-400 text-xs font-light tracking-wider mb-6">{selectedCat.desc}</p>

          <div className="space-y-4">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              placeholder="想詢問的問題（選填，例如：近期的事業發展如何？）"
              className="w-full bg-transparent border border-white/15 rounded-2xl px-4 py-3 text-white text-base md:text-sm font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors placeholder-white/30 resize-none"
            />

            {NEEDS_NAME.has(selectedCat.id) && (
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="姓名 Name"
                className="w-full bg-transparent border border-white/15 rounded-2xl px-4 py-3 text-white text-base md:text-sm font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors placeholder-white/30"
              />
            )}

            {NEEDS_BIRTH.has(selectedCat.id) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-[#A89882]/80 tracking-widest pl-1">出生日期</span>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-3 text-white text-base md:text-sm font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-[#A89882]/80 tracking-widest pl-1">出生時間</span>
                  <input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-3 text-white text-base md:text-sm font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-[#A89882]/80 tracking-widest pl-1">性別（選填）</span>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-3 text-white text-base md:text-sm font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors"
                  >
                    <option value="">請選擇</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </label>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => void draw(selectedCat.id === 'tarot' ? 'tarot' : 'short_reading')}
                disabled={busy}
                className="flex-1 py-4 bg-[#A89882] text-[#050508] font-medium tracking-[0.2em] rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(168,152,130,0.3)] flex justify-center items-center gap-2 disabled:opacity-60"
              >
                {busy ? '解讀中…' : selectedCat.id === 'tarot' ? '抽牌解讀' : '開始解讀'}
                <Icons.Sparkles size={16} />
              </button>
              <button
                onClick={() => void draw('premium_report')}
                disabled={busy}
                className="flex-1 py-4 bg-transparent border border-[#A89882]/60 text-[#A89882] font-medium tracking-[0.2em] rounded-full hover:bg-[#A89882] hover:text-[#050508] transition-all flex justify-center items-center gap-2 disabled:opacity-60"
              >
                深度報告
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#A89882]/20 tracking-widest">PRO</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
            <p key={idx} className="text-slate-300/90 leading-relaxed tracking-widest text-sm font-light text-justify break-words">
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
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <button
            className="w-full sm:w-auto px-6 py-4 rounded-full border border-[#A89882]/40 text-[#A89882] tracking-[0.2em] text-xs hover:bg-[#A89882] hover:text-[#050508] transition-all flex items-center justify-center gap-2"
            onClick={() => setChatOpen(true)}
          >
            <Icons.MessageCircle size={16} />
            命理老師對話
          </button>
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
      {chatOpen && createPortal(<ChatPanel onClose={() => setChatOpen(false)} />, document.body)}
    </>
  );
}

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', text: '你好，我是你的專屬命理老師。想聊聊感情、事業、財運，或近期的困惑嗎？' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setBusy(true);
    try {
      const res = await api.generate('premium_chat', { question: text, history });
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: res?.ok ? res.content : res?.message ?? '目前服務暫時無法使用，請稍後再試。',
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: '目前服務暫時無法使用，請稍後再試。' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/80 px-0 pb-0 pt-[calc(var(--safe-top)+10px)] backdrop-blur-sm animate-[fadeIn_0.3s_ease-out] sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-[min(68dvh,620px)] max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-20px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] border-x border-t border-[#A89882]/30 bg-[#0b0b10] shadow-[0_-20px_60px_rgba(0,0,0,0.68)] sm:h-[min(80vh,720px)] sm:rounded-[2rem] sm:border"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="命理老師對話"
      >
        <div className="shrink-0 border-b border-white/10 bg-[#0b0b10]/95 px-4 pb-3 pt-2 sm:px-6 sm:py-4">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15 sm:hidden"></div>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Icons.MessageCircle size={16} className="text-[#A89882]" />
              <span className="text-sm text-white tracking-widest font-light">命理老師對話</span>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/15 px-3 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="關閉命理老師對話"
            >
              <Icons.X size={18} />
              <span className="text-xs tracking-widest">關閉</span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-4 py-5 space-y-4 custom-scrollbar sm:px-5 sm:py-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[86%] px-4 py-3 rounded-2xl text-sm leading-relaxed tracking-wide whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-[#A89882] text-[#050508] rounded-br-sm'
                    : 'bg-white/[0.04] border border-white/10 text-slate-200 rounded-bl-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-slate-400 text-sm">
                老師思索中…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="shrink-0 border-t border-white/10 p-3 pb-[calc(var(--safe-bottom)+12px)] flex items-end gap-3 sm:p-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="輸入訊息…（Enter 送出）"
            className="min-h-12 flex-1 bg-transparent border border-white/15 rounded-2xl px-4 py-3 text-white text-base md:text-sm font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors placeholder-white/30 resize-none max-h-28"
          />
          <button
            onClick={() => void send()}
            disabled={busy || !input.trim()}
            className="w-12 h-12 shrink-0 rounded-full bg-[#A89882] text-[#050508] flex items-center justify-center hover:bg-white transition-all disabled:opacity-50"
          >
            <Icons.Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
