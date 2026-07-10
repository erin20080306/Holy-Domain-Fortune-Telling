import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { FORTUNE_CATEGORIES } from '@shared/categories';
import { formatChineseBirthHour, formatChineseBirthHourInline } from '@shared/chineseTime';
import { buildFortuneChartData } from '@shared/fortuneChart';
import { formatLunarDateForPrompt } from '@shared/lunarCalendar';
import { PLAN_DISPLAY, PLAN_LABEL, type PlanId } from '@shared/plans';
import { useAuth } from '../state/AuthContext';
import { api } from '../lib/api';
import { beginPaypalCheckout } from '../lib/checkout';

const NEEDS_NAME = new Set(['name']);
const MIN_BIRTH_YEAR = 1900;
const MAX_BIRTH_YEAR = new Date().getFullYear();
const PLAN_PROMPT_DISMISS_KEY = 'mystic.planPrompt.dismissedSession';
const ACTIVE_PAID_STATUSES = new Set(['active', 'manual_active']);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const CHART_SUMMARY_LABELS = [
  '生肖',
  '農曆年干支',
  '時辰地支',
  '生命靈數',
  '八字四柱',
  '八字日主',
  '八字五行分布',
  '八字大運起運',
  '紫微命宮',
  '紫微命宮主星',
];
const CHAT_SUGGESTIONS = ['追問性格盲點', '追問感情互動', '追問事業方向', '整理近期行動'];
const MAX_CHAT_CONTEXT_CHARS = 2600;

interface ReportTableData {
  headers: string[];
  rows: string[][];
}

type ReportBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'table'; table: ReportTableData };

interface ReportSection {
  title: string;
  blocks: ReportBlock[];
}

type ResultKind = 'short' | 'premium' | 'tarot' | null;

interface SavedReading {
  id: string;
  category: string;
  title: string;
  question: string | null;
  content: string;
  input_snapshot: Record<string, string>;
  created_at: string;
}

interface ReportAccent {
  text: string;
  border: string;
  surface: string;
  header: string;
  badge: string;
}

const REPORT_ACCENTS: Record<string, ReportAccent> = {
  data: {
    text: 'text-[#A89882]',
    border: 'border-[#A89882]/30',
    surface: 'bg-[#A89882]/[0.045]',
    header: 'bg-[#A89882]/10',
    badge: 'bg-[#A89882]/15',
  },
  core: {
    text: 'text-[#f3ead9]',
    border: 'border-[#f3ead9]/20',
    surface: 'bg-white/[0.035]',
    header: 'bg-white/[0.06]',
    badge: 'bg-white/[0.08]',
  },
  personality: {
    text: 'text-violet-200',
    border: 'border-violet-300/25',
    surface: 'bg-violet-300/[0.04]',
    header: 'bg-violet-300/[0.08]',
    badge: 'bg-violet-300/[0.10]',
  },
  career: {
    text: 'text-cyan-200',
    border: 'border-cyan-300/25',
    surface: 'bg-cyan-300/[0.04]',
    header: 'bg-cyan-300/[0.08]',
    badge: 'bg-cyan-300/[0.10]',
  },
  wealth: {
    text: 'text-amber-200',
    border: 'border-amber-300/25',
    surface: 'bg-amber-300/[0.04]',
    header: 'bg-amber-300/[0.08]',
    badge: 'bg-amber-300/[0.10]',
  },
  relationship: {
    text: 'text-rose-200',
    border: 'border-rose-300/25',
    surface: 'bg-rose-300/[0.04]',
    header: 'bg-rose-300/[0.08]',
    badge: 'bg-rose-300/[0.10]',
  },
  timing: {
    text: 'text-sky-200',
    border: 'border-sky-300/25',
    surface: 'bg-sky-300/[0.04]',
    header: 'bg-sky-300/[0.08]',
    badge: 'bg-sky-300/[0.10]',
  },
  advice: {
    text: 'text-emerald-200',
    border: 'border-emerald-300/25',
    surface: 'bg-emerald-300/[0.04]',
    header: 'bg-emerald-300/[0.08]',
    badge: 'bg-emerald-300/[0.10]',
  },
};

interface SubscriptionLike {
  plan?: string;
  status?: string;
  current_period_end?: string | null;
}

function readPlanPromptDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(PLAN_PROMPT_DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
}

function rememberPlanPromptDismissed() {
  try {
    window.sessionStorage.setItem(PLAN_PROMPT_DISMISS_KEY, 'true');
  } catch {
    /* ignore */
  }
}

function isActivePaidSubscription(subscription: SubscriptionLike | null): boolean {
  if (!subscription || subscription.plan === 'free') return false;
  if (!ACTIVE_PAID_STATUSES.has(subscription.status ?? 'none')) return false;
  if (!subscription.current_period_end) return true;

  const expiresAt = Date.parse(subscription.current_period_end);
  return !Number.isFinite(expiresAt) || expiresAt > Date.now();
}

function pad2(value: string): string {
  return value.padStart(2, '0');
}

function daysInGregorianMonth(year: string, month: string): number {
  const y = Number(year || MAX_BIRTH_YEAR);
  const m = Number(month || 1);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return 31;
  return new Date(y, m, 0).getDate();
}

function composeBirthDate(year: string, month: string, day: string): string | undefined {
  if (!year && !month && !day) return undefined;
  if (!/^\d{4}$/.test(year) || !month || !day) return undefined;

  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (y < MIN_BIRTH_YEAR || y > MAX_BIRTH_YEAR) return undefined;
  if (m < 1 || m > 12 || d < 1 || d > daysInGregorianMonth(year, month)) return undefined;

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function formatSolarDateForDisplay(solarDate: string): string {
  const [year, month, day] = solarDate.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

function usageLabel(usageType: string): string {
  switch (usageType) {
    case 'premium_report':
      return '深度報告';
    case 'premium_chat':
      return '命理老師對話';
    case 'tarot':
      return '塔羅解讀';
    default:
      return '命理短解讀';
  }
}

function formatGenerateError(res: any, usageType: string): string {
  const label = usageLabel(usageType);
  const used = Number(res?.used);
  const limit = Number(res?.limit);
  const hasQuotaNumbers = Number.isFinite(used) && Number.isFinite(limit);

  if (res?.reason === 'quota_exhausted' && hasQuotaNumbers) {
    const dailyTarot = usageType === 'tarot' && limit <= 1;
    const usedPeriod = dailyTarot ? '今日' : '本月';
    const limitPeriod = dailyTarot ? '每日' : '每月';
    const resetHint = dailyTarot ? '明日' : '下個月';
    return `${usedPeriod}${label}額度已用完（已用 ${used} / ${limitPeriod} ${limit} 次）。請${resetHint}再使用，或至方案頁升級／調整方案。`;
  }

  if (res?.reason === 'plan_required') {
    return `${label}需要有效訂閱方案才能使用。若後台已手動開通，請確認方案、狀態與到期日仍有效。`;
  }

  return res?.message ?? '目前服務暫時無法使用，請稍後再試。';
}

function resultTierMeta(kind: ResultKind): { label: string; detail: string; tone: string } {
  if (kind === 'premium') {
    return {
      label: '專業深度報告',
      detail: '校盤細論｜性格底盤｜事業財運感情｜行動策略',
      tone: 'border-[#A89882]/40 bg-[#A89882]/10 text-[#f4e7d3]',
    };
  }

  if (kind === 'tarot') {
    return {
      label: '塔羅神諭短讀',
      detail: '牌陣重點｜當下狀態｜下一步建議',
      tone: 'border-rose-300/25 bg-rose-300/[0.06] text-rose-100',
    };
  }

  return {
    label: 'AI 短讀',
    detail: '快速掃讀｜表格重點｜近期建議',
    tone: 'border-cyan-300/25 bg-cyan-300/[0.06] text-cyan-100',
  };
}

function compactChatContext(content: string, kind: ResultKind): string | undefined {
  const cleaned = content
    .replace(/\[debug\][\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return undefined;

  const label = kind === 'premium' ? '最近一次深度報告' : kind === 'tarot' ? '最近一次塔羅短讀' : '最近一次AI短讀';
  const clipped =
    cleaned.length > MAX_CHAT_CONTEXT_CHARS
      ? `${cleaned.slice(0, MAX_CHAT_CONTEXT_CHARS)}…`
      : cleaned;
  return `${label}摘要：${clipped}`;
}

function reportHeading(line: string): string | null {
  const trimmed = line.trim();
  const bracket = /^【(.{2,24})】$/.exec(trimmed);
  if (bracket) return bracket[1];

  const numbered = /^([一二三四五六七八九十]+[、.．]\s*)?(.{2,24})$/.exec(trimmed);
  if (!numbered) return null;

  const title = numbered[2].trim();
  if (/[。！？；，]/.test(title)) return null;
  if (/^(命盤資料校對|性格分析|性格底盤|核心觀察|事業與財運|感情與人際|近期建議|整體格局|事業|感情|財運|近期|行動建議)/.test(title)) {
    return title;
  }

  return numbered[1] ? title : null;
}

function reportAccent(title: string): ReportAccent {
  if (/命盤|資料|校對|出生/.test(title)) return REPORT_ACCENTS.data;
  if (/性格|個性|天賦|盲點|人格|底盤/.test(title)) return REPORT_ACCENTS.personality;
  if (/事業|學業|工作|貴人/.test(title)) return REPORT_ACCENTS.career;
  if (/財運|財帛|資源|風險|金錢/.test(title)) return REPORT_ACCENTS.wealth;
  if (/感情|人際|夫妻|關係/.test(title)) return REPORT_ACCENTS.relationship;
  if (/近期|三個月|流年|節奏|時機/.test(title)) return REPORT_ACCENTS.timing;
  if (/行動|建議|提醒|調整/.test(title)) return REPORT_ACCENTS.advice;
  return REPORT_ACCENTS.core;
}

function splitTableCells(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return null;

  const cells = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

  return cells.length >= 2 ? cells : null;
}

function isTableSeparator(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')));
}

function normalizeTableRow(cells: string[], columnCount: number): string[] {
  if (cells.length === columnCount) return cells;
  if (cells.length < columnCount) {
    return [...cells, ...Array.from({ length: columnCount - cells.length }, () => '')];
  }

  return [...cells.slice(0, columnCount - 1), cells.slice(columnCount - 1).join('｜')];
}

function parseReportBlocks(body: string): ReportBlock[] {
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: ReportBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join('\n').trim();
    if (text) blocks.push({ type: 'paragraph', text });
    paragraphLines = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const headers = splitTableCells(lines[i]);
    const separator = splitTableCells(lines[i + 1] ?? '');

    if (headers && separator && isTableSeparator(separator)) {
      flushParagraph();
      const rows: string[][] = [];
      const columnCount = headers.length;
      i += 2;

      for (; i < lines.length; i += 1) {
        const cells = splitTableCells(lines[i]);
        if (!cells || isTableSeparator(cells)) {
          i -= 1;
          break;
        }
        rows.push(normalizeTableRow(cells, columnCount));
      }

      if (rows.length) blocks.push({ type: 'table', table: { headers, rows } });
    } else {
      paragraphLines.push(lines[i]);
    }
  }

  flushParagraph();
  return blocks.length ? blocks : [{ type: 'paragraph', text: body.trim() }];
}

function splitReportSections(content: string): ReportSection[] {
  const lines = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: ReportSection[] = [];
  let currentTitle = '整體解讀';
  let currentLines: string[] = [];

  const pushCurrent = () => {
    const body = currentLines.join('\n').trim();
    if (body) sections.push({ title: currentTitle, blocks: parseReportBlocks(body) });
  };

  for (const line of lines) {
    const heading = reportHeading(line);
    if (heading) {
      pushCurrent();
      currentTitle = heading;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  pushCurrent();
  return sections.length ? sections : [{ title: '整體解讀', blocks: parseReportBlocks(content) }];
}

function ReportTableView({
  table,
  accent,
}: {
  table: ReportTableData;
  accent: ReportAccent;
}) {
  return (
    <div className={`mt-4 overflow-hidden rounded-2xl border ${accent.border} ${accent.surface}`}>
      <div className={`flex items-center gap-2 border-b px-4 py-3 ${accent.border} ${accent.header}`}>
        <Icons.Table2 size={14} className={accent.text} />
        <span className={`text-[11px] font-medium tracking-[0.18em] ${accent.text}`}>命理表格</span>
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {table.rows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={`rounded-2xl border ${accent.border} bg-black/15 p-3`}
          >
            {row.map((cell, cellIdx) => (
              <div key={`${rowIdx}-${cellIdx}`} className="border-b border-white/10 py-2 last:border-0 last:pb-0 first:pt-0">
                <div className={`mb-1 text-[10px] font-medium tracking-[0.18em] ${accent.text}`}>
                  {table.headers[cellIdx] ?? `欄位 ${cellIdx + 1}`}
                </div>
                <div className="text-sm font-light leading-7 tracking-wide text-slate-300/95 break-words">
                  {cell}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10">
              {table.headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className={`px-4 py-3 text-[11px] font-medium leading-5 tracking-[0.14em] ${accent.text}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-white/5 last:border-0 odd:bg-white/[0.025]">
                {row.map((cell, cellIdx) => (
                  <td
                    key={`${rowIdx}-${cellIdx}`}
                    className={`px-4 py-3 align-top text-sm font-light leading-7 tracking-wide break-words ${
                      cellIdx === 0 ? accent.text : 'text-slate-300/90'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GeneratingStatus({
  categoryName,
  usageType,
}: {
  categoryName: string;
  usageType: string | null;
}) {
  const premium = usageType === 'premium_report';
  const tarot = usageType === 'tarot';
  const title = premium ? '深度報告產生中' : tarot ? '神諭牌陣解讀中' : '命理解讀產生中';
  const steps = premium
    ? ['校對出生國曆、農曆與命理時辰', '排出八字四柱、大運與紫微十二宮', '整理性格底盤、事業財運與感情脈絡', '撰寫專業命理老師深度書面報告']
    : tarot
      ? ['抽取牌陣與正逆位', '整理目前狀態與阻礙', '生成 80–150 字短讀與行動建議']
      : ['校對算命者資料', '整理系統排盤重點', '生成表格式短讀與近期建議'];

  return (
    <div
      className="mt-8 rounded-[1.5rem] border border-[#A89882]/25 bg-black/30 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] md:rounded-[2rem] md:p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#A89882]/30 bg-[#A89882]/10">
          <Icons.Loader2 size={18} className="animate-spin text-[#A89882]" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.24em] text-[#A89882]/75">GENERATING</p>
          <h3 className="mt-1 text-base font-light tracking-widest text-white">{title}</h3>
          <p className="mt-2 text-sm font-light leading-7 tracking-wide text-slate-300">
            {premium
              ? `${categoryName} 正在校盤、分章細論與整理專業報告，請稍候。`
              : tarot
                ? `${categoryName} 正在整理牌陣重點，會以簡短文字直接解讀。`
                : `${categoryName} 正在整理重點，短讀會以表格快速呈現。`}
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.025] px-3 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#A89882]/15 text-[10px] text-[#A89882]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-sm font-light leading-6 tracking-wide text-slate-200">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadingHistoryModal({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (reading: SavedReading) => void;
}) {
  const [readings, setReadings] = useState<SavedReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    void api
      .getReadings()
      .then((response) => {
        if (!response?.ok) {
          setError(response?.message ?? '目前無法讀取歷史報告。');
          return;
        }
        setAvailable(response.available !== false);
        setReadings(Array.isArray(response.readings) ? response.readings : []);
      })
      .catch(() => setError('目前無法讀取歷史報告。'))
      .finally(() => setLoading(false));
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const remove = async (readingId: string) => {
    if (!window.confirm('確定刪除這份深度報告？刪除後無法復原。')) return;
    setDeletingId(readingId);
    const response = await api.deleteReading(readingId);
    if (response?.ok) {
      setReadings((items) => items.filter((item) => item.id !== readingId));
    } else {
      setError('刪除失敗，請稍後再試。');
    }
    setDeletingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/80 px-0 pt-[calc(var(--safe-top)+10px)] backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-var(--safe-top)-12px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.5rem] border border-[#A89882]/25 bg-[#09090e] sm:max-h-[82vh] sm:rounded-[2rem]"
        role="dialog"
        aria-modal="true"
        aria-label="歷史深度報告"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-[#A89882]/70">REPORT ARCHIVE</p>
            <h3 className="mt-1 text-lg font-light tracking-widest text-white">歷史深度報告</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/80"
            aria-label="關閉歷史報告"
          >
            <Icons.X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-[calc(var(--safe-bottom)+16px)] custom-scrollbar sm:p-6">
          {loading && <p className="py-10 text-center text-sm text-slate-400">讀取報告中…</p>}
          {!loading && !available && (
            <p className="rounded-2xl border border-[#e0a97a]/25 bg-[#e0a97a]/5 p-4 text-sm leading-7 text-[#e0a97a]">
              歷史報告資料表尚未啟用，請先執行最新的 Supabase migration。
            </p>
          )}
          {!loading && available && !error && readings.length === 0 && (
            <div className="py-12 text-center">
              <Icons.ScrollText className="mx-auto text-[#A89882]/50" size={28} />
              <p className="mt-4 text-sm tracking-wide text-slate-400">尚未產生深度報告</p>
            </div>
          )}
          {error && <p className="text-sm text-[#e0a97a]">{error}</p>}
          {readings.map((reading) => (
            <article key={reading.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="text-base font-light tracking-widest text-white">{reading.title}</h4>
                  <p className="mt-2 text-xs tracking-wide text-[#A89882]/70">
                    {new Intl.DateTimeFormat('zh-TW', {
                      timeZone: 'Asia/Taipei',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(reading.created_at))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(reading.id)}
                  disabled={deletingId === reading.id}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/45 hover:text-rose-200"
                  aria-label={`刪除${reading.title}`}
                >
                  <Icons.Trash2 size={15} />
                </button>
              </div>
              {reading.question && (
                <p className="mt-3 line-clamp-2 text-sm font-light leading-7 tracking-wide text-slate-400">
                  提問：{reading.question}
                </p>
              )}
              <button
                type="button"
                onClick={() => onOpen(reading)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#A89882]/40 px-4 py-3 text-xs tracking-[0.16em] text-[#A89882] hover:bg-[#A89882] hover:text-black"
              >
                開啟完整報告
                <Icons.ArrowRight size={14} />
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanPromptModal({
  onClose,
  onSubscribe,
  busyPlan,
  error,
}: {
  onClose: () => void;
  onSubscribe: (plan: Exclude<PlanId, 'free'>) => void;
  busyPlan: PlanId | null;
  error: string;
}) {
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

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/80 px-3 pb-[calc(var(--safe-bottom)+12px)] pt-[calc(var(--safe-top)+12px)] backdrop-blur-md animate-[fadeIn_0.3s_ease-out] sm:items-center sm:p-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-24px)] w-full max-w-5xl overflow-y-auto rounded-[1.5rem] border border-[#A89882]/25 bg-[#08080d] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.72)] custom-scrollbar sm:rounded-[2rem] sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="選擇方案"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.28em] text-[#A89882]/75">MYSTIC PLAN</p>
            <h3 className="mt-2 text-xl font-light tracking-widest text-white sm:text-2xl">選擇你的命理解讀方案</h3>
            <p className="mt-2 max-w-2xl text-sm font-light leading-7 tracking-wide text-slate-400">
              免費可先體驗，訂閱可解鎖深度報告、更多短讀、塔羅與命理老師追問。
            </p>
            {error && <p className="mt-2 text-sm text-[#e0a97a]">{error}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="關閉方案提示"
          >
            <Icons.X size={18} />
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {PLAN_DISPLAY.map((plan) => {
            const paid = plan.id !== 'free';
            const highlighted = plan.id === 'pro_monthly';
            return (
              <section
                key={plan.id}
                className={`relative flex min-h-[360px] flex-col rounded-2xl border p-5 ${
                  highlighted
                    ? 'border-[#A89882]/55 bg-[#A89882]/[0.085] shadow-[0_18px_44px_rgba(168,152,130,0.12)]'
                    : 'border-white/10 bg-white/[0.025]'
                }`}
              >
                {highlighted && (
                  <div className="absolute right-4 top-4 rounded-full border border-[#A89882]/35 bg-[#A89882]/15 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-[#f4e7d3]">
                    推薦
                  </div>
                )}
                <div className="mb-5">
                  <h4 className="pr-16 text-lg font-light tracking-widest text-white">{plan.title}</h4>
                  <div className="mt-3 text-2xl font-serif text-[#f3ead9]">{plan.price}</div>
                </div>
                <ul className="mb-6 flex-1 space-y-3 text-sm font-light leading-6 tracking-wide text-slate-300">
                  {plan.features.slice(0, 5).map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <Icons.Check size={15} className="mt-1 shrink-0 text-[#A89882]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {paid ? (
                  <button
                    type="button"
                    onClick={() => onSubscribe(plan.id as Exclude<PlanId, 'free'>)}
                    disabled={busyPlan !== null}
                    className="mt-auto flex w-full items-center justify-center gap-2 rounded-full bg-[#A89882] px-5 py-3.5 text-center text-xs font-semibold tracking-[0.18em] text-[#050508] transition-colors hover:bg-white"
                  >
                    {busyPlan === plan.id ? '建立付款連結中…' : '直接訂閱'}
                    <Icons.ArrowRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-auto w-full rounded-full border border-white/15 px-5 py-3.5 text-xs font-semibold tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-[#050508]"
                  >
                    繼續免費體驗
                  </button>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DashboardScreen() {
  const nav = useNavigate();
  const { subscription, isAdmin } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [resultKind, setResultKind] = useState<ResultKind>(null);
  const [busy, setBusy] = useState(false);
  const [busyType, setBusyType] = useState<string | null>(null);

  const [question, setQuestion] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedReadingId, setSavedReadingId] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<PlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [planPromptDismissed, setPlanPromptDismissed] = useState(readPlanPromptDismissed);
  const panelRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const plan = (subscription?.plan ?? 'free') as PlanId;
  const selectedCat = FORTUNE_CATEGORIES.find((c) => c.id === selected) ?? null;
  const birthDayMax = daysInGregorianMonth(birthYear, birthMonth);
  const reportSections = result ? splitReportSections(result) : [];
  const composedBirthDate = composeBirthDate(birthYear, birthMonth, birthDay);
  const lunarBirthDate = composedBirthDate ? formatLunarDateForPrompt(composedBirthDate) : null;
  const birthHour = birthTime ? formatChineseBirthHour(birthTime) : null;
  const inlineBirthHour = birthTime ? formatChineseBirthHourInline(birthTime) : null;
  const fortuneChartData = buildFortuneChartData({
    category: selectedCat?.id,
    name: fullName,
    gender,
    birthDate: composedBirthDate,
    birthTime,
  });
  const chartSummaryFacts = fortuneChartData.facts.filter(
    (fact) =>
      CHART_SUMMARY_LABELS.includes(fact.label) &&
      fact.value !== '未提供',
  );
  const zodiacFact = fortuneChartData.facts.find((fact) => fact.label === '生肖')?.value ?? '未提供';
  const yearGanZhiFact = fortuneChartData.facts.find((fact) => fact.label === '農曆年干支')?.value ?? '未提供';
  const lifePathFact = fortuneChartData.facts.find((fact) => fact.label === '生命靈數')?.value ?? '未提供';
  const hasPartialBirthDate = Boolean(birthYear || birthMonth || birthDay);
  const resultTier = resultTierMeta(resultKind);
  const showPlanPrompt = Boolean(
    subscription &&
      !isAdmin &&
      !planPromptDismissed &&
      !isActivePaidSubscription(subscription),
  );

  const dismissPlanPrompt = () => {
    rememberPlanPromptDismissed();
    setPlanPromptDismissed(true);
  };

  const startCheckout = async (checkoutPlan: Exclude<PlanId, 'free'>) => {
    setCheckoutError('');
    setCheckoutBusy(checkoutPlan);
    const error = await beginPaypalCheckout(checkoutPlan);
    if (error) {
      setCheckoutError(error);
      setCheckoutBusy(null);
    }
  };

  const pick = (id: string) => {
    setSelected(id);
    setResult('');
    setResultKind(null);
    setSavedReadingId(null);
  };

  const openSavedReading = (reading: SavedReading) => {
    const snapshot = reading.input_snapshot ?? {};
    const dateParts = snapshot.birth_date?.split('-') ?? [];
    setSelected(reading.category);
    setQuestion(reading.question ?? '');
    setFullName(snapshot.name ?? '');
    setGender(snapshot.gender ?? '');
    setBirthYear(dateParts[0] ?? '');
    setBirthMonth(dateParts[1] ? String(Number(dateParts[1])) : '');
    setBirthDay(dateParts[2] ? String(Number(dateParts[2])) : '');
    setBirthTime(snapshot.birth_time ?? '');
    setResult(reading.content);
    setResultKind('premium');
    setSavedReadingId(reading.id);
    setHistoryOpen(false);
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180);
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

  useEffect(() => {
    if (birthDay && Number(birthDay) > birthDayMax) {
      setBirthDay(String(birthDayMax));
    }
  }, [birthDay, birthDayMax]);

  const draw = async (usageType: string) => {
    if (!selectedCat) return;
    const nextResultKind: ResultKind =
      usageType === 'premium_report' ? 'premium' : usageType === 'tarot' ? 'tarot' : 'short';

    if (hasPartialBirthDate && !composedBirthDate) {
      setResultKind(null);
      setResult('請輸入完整且有效的出生年月日。');
      return;
    }

    setBusy(true);
    setBusyType(usageType);
    setResultKind(nextResultKind);
    setResult('');
    setSavedReadingId(null);
    try {
      const res = await api.generate(usageType, {
        category: selectedCat.id,
        question: question.trim() || undefined,
        name: NEEDS_NAME.has(selectedCat.id) ? fullName.trim() || undefined : undefined,
        gender: gender || undefined,
        birth_date: composedBirthDate,
        birth_time: birthTime || undefined,
      });
      if (res?.ok) {
        setResult(res.content);
        setSavedReadingId(typeof res.reading_id === 'string' ? res.reading_id : null);
      } else {
        const base = formatGenerateError(res, usageType);
        setResult(isAdmin && res?.debug ? `${base}\n\n[debug] ${res.debug}` : base);
      }
    } catch {
      setResult('目前服務暫時無法使用，請稍後再試。');
    } finally {
      setBusy(false);
      setBusyType(null);
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

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#A89882]/80 tracking-widest pl-1">算命者出生日期</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] text-white/45 tracking-[0.18em] pl-1">西元年</span>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="1983"
                        aria-label="出生西元年"
                        className="w-full bg-black/40 border border-white/15 rounded-2xl py-3 pl-4 pr-10 text-white text-base md:text-sm font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors placeholder-white/30"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#A89882]/80">年</span>
                    </div>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] text-white/45 tracking-[0.18em] pl-1">月份</span>
                    <div className="relative">
                      <select
                        value={birthMonth}
                        onChange={(e) => setBirthMonth(e.target.value)}
                        aria-label="出生月份"
                        style={{ colorScheme: 'dark' }}
                        className="w-full appearance-none bg-black/40 border border-white/15 rounded-2xl py-3 pl-4 pr-10 text-white text-base md:text-sm font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors"
                      >
                        <option value="">選擇月份</option>
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month} value={month}>
                            {month} 月
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#A89882]/80">月</span>
                    </div>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] text-white/45 tracking-[0.18em] pl-1">日期</span>
                    <div className="relative">
                      <select
                        value={birthDay}
                        onChange={(e) => setBirthDay(e.target.value)}
                        aria-label="出生日"
                        style={{ colorScheme: 'dark' }}
                        className="w-full appearance-none bg-black/40 border border-white/15 rounded-2xl py-3 pl-4 pr-10 text-white text-base md:text-sm font-light tracking-wider focus:outline-none focus:border-[#A89882] transition-colors"
                      >
                        <option value="">選擇日期</option>
                        {DAY_OPTIONS.slice(0, birthDayMax).map((day) => (
                          <option key={day} value={day}>
                            {day} 日
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#A89882]/80">日</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-[#A89882]/20 bg-black/25 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Icons.CalendarDays size={14} className="text-[#A89882]" />
                  <span className="text-[10px] text-[#A89882] tracking-[0.2em]">國曆 / 農曆確認</span>
                </div>
                <div className="grid gap-2 text-sm leading-7 tracking-wide">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-[10px] text-white/45 tracking-[0.18em]">國曆</span>
                    <span className="text-slate-100">
                      {composedBirthDate ? formatSolarDateForDisplay(composedBirthDate) : '請先填寫完整年月日'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-[10px] text-white/45 tracking-[0.18em]">農曆</span>
                    <span className="text-slate-100">
                      {lunarBirthDate ?? '填寫後自動換算'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-[10px] text-white/45 tracking-[0.18em]">時辰</span>
                    <span className="text-slate-100">
                      {birthHour ?? '選擇出生時間後自動換算'}
                    </span>
                  </div>
                </div>
                {chartSummaryFacts.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Icons.ListChecks size={14} className="text-[#A89882]" />
                      <span className="text-[10px] text-[#A89882]/80 tracking-[0.2em]">系統排盤資料</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {chartSummaryFacts.map((fact) => (
                        <div key={fact.label} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                          <div className="text-[10px] text-white/45 tracking-[0.16em]">{fact.label}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-100 break-words">{fact.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => void draw(selectedCat.id === 'tarot' ? 'tarot' : 'short_reading')}
                disabled={busy}
                className="flex-1 py-4 bg-[#A89882] text-[#050508] font-medium tracking-[0.2em] rounded-full hover:bg-white transition-all shadow-[0_0_20px_rgba(168,152,130,0.3)] flex justify-center items-center gap-2 disabled:opacity-60"
              >
                {busy && busyType !== 'premium_report'
                  ? '解讀中…'
                  : selectedCat.id === 'tarot'
                    ? '抽牌解讀'
                    : 'AI短讀'}
                <Icons.Sparkles size={16} />
              </button>
              <button
                onClick={() => void draw('premium_report')}
                disabled={busy}
                className="flex-1 py-4 bg-transparent border border-[#A89882]/60 text-[#A89882] font-medium tracking-[0.2em] rounded-full hover:bg-[#A89882] hover:text-[#050508] transition-all flex justify-center items-center gap-2 disabled:opacity-60"
              >
                {busy && busyType === 'premium_report' ? '報告生成中…' : '深度報告'}
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#A89882]/20 tracking-widest">PRO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {busy && selectedCat && (
        <GeneratingStatus categoryName={selectedCat.name} usageType={busyType} />
      )}

      {result && (
        <div ref={resultRef} className="scroll-mt-6 bg-white/[0.025] backdrop-blur-md border border-[#A89882]/20 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 relative overflow-hidden mt-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#A89882]/70 to-transparent"></div>
          <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#A89882]/30 bg-black/30">
                <Icons.ScrollText size={18} className="text-[#A89882]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] text-[#A89882]/70 tracking-[0.28em]">INTERPRETATION</p>
                <h3 className="mt-1 text-lg font-light tracking-widest text-white">
                  {selectedCat?.name ?? '命理報告'}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] tracking-widest text-[#A89882]/70">
              {savedReadingId ? (
                <>
                  <Icons.BookMarked size={14} />
                  已保存
                </>
              ) : (
                <>
                  <Icons.ListTree size={14} />
                  {reportSections.length} 節
                </>
              )}
            </div>
          </div>

          <div className={`mb-6 rounded-2xl border px-4 py-3 ${resultTier.tone}`}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Icons.BadgeCheck size={15} />
                <span className="text-sm font-medium tracking-[0.18em]">{resultTier.label}</span>
              </div>
              <span className="text-[11px] font-light leading-6 tracking-[0.12em] opacity-80">
                {resultTier.detail}
              </span>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-[#A89882]/20 bg-black/25 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Icons.UserRound size={14} className="text-[#A89882]" />
              <span className="text-[10px] text-[#A89882] tracking-[0.2em]">算命者資料</span>
            </div>
            <div className="grid gap-3 text-sm leading-7 tracking-wide sm:grid-cols-2">
              <div>
                <div className="text-[10px] text-white/45 tracking-[0.18em]">出生國曆</div>
                <div className="mt-0.5 text-slate-100">
                  {composedBirthDate ? formatSolarDateForDisplay(composedBirthDate) : '未提供'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/45 tracking-[0.18em]">出生農曆</div>
                <div className="mt-0.5 text-slate-100">{lunarBirthDate ?? '未提供'}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/45 tracking-[0.18em]">出生時間 / 時辰</div>
                <div className="mt-0.5 text-slate-100">
                  {birthTime ? `${birthTime}${inlineBirthHour ? `（${inlineBirthHour}）` : ''}` : '未提供'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/45 tracking-[0.18em]">性別</div>
                <div className="mt-0.5 text-slate-100">{gender || '未提供'}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/45 tracking-[0.18em]">生肖 / 農曆年干支</div>
                <div className="mt-0.5 text-slate-100">{zodiacFact} / {yearGanZhiFact}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/45 tracking-[0.18em]">生命靈數</div>
                <div className="mt-0.5 text-slate-100 break-words">{lifePathFact}</div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/10 border-y border-white/10">
            {reportSections.map((section, idx) => {
              const accent = reportAccent(section.title);
              return (
                <section key={`${section.title}-${idx}`} className="py-6 first:pt-5 last:pb-5">
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${accent.border} ${accent.badge} text-[11px] ${accent.text}`}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <h4 className={`text-sm font-normal leading-6 tracking-[0.18em] break-words ${accent.text}`}>
                      {section.title}
                    </h4>
                  </div>
                  <div className="space-y-4 pl-0 sm:pl-11">
                    {section.blocks.map((block, blockIdx) =>
                      block.type === 'table' ? (
                        <ReportTableView
                          key={`table-${blockIdx}`}
                          table={block.table}
                          accent={accent}
                        />
                      ) : (
                        <div key={`paragraph-${blockIdx}`} className="space-y-3">
                          {block.text.split('\n').map((paragraph, paragraphIdx) => (
                            <p
                              key={paragraphIdx}
                              className="text-sm font-light leading-8 tracking-wide text-slate-300/90 break-words"
                            >
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      ),
                    )}
                  </div>
                </section>
              );
            })}
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
            onClick={() => setHistoryOpen(true)}
          >
            <Icons.BookOpen size={16} />
            歷史報告
          </button>
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
      {showPlanPrompt &&
        createPortal(
          <PlanPromptModal
            onClose={dismissPlanPrompt}
            onSubscribe={(checkoutPlan) => void startCheckout(checkoutPlan)}
            busyPlan={checkoutBusy}
            error={checkoutError}
          />,
          document.body,
        )}
      {chatOpen &&
        createPortal(
          <ChatPanel
            onClose={() => setChatOpen(false)}
            categoryId={selectedCat?.id}
            categoryName={selectedCat?.name}
            name={fullName.trim() || undefined}
            gender={gender || undefined}
            birthDate={composedBirthDate}
            birthTime={birthTime || undefined}
            reportContext={compactChatContext(result, resultKind)}
          />,
          document.body,
        )}
      {historyOpen &&
        createPortal(
          <ReadingHistoryModal
            onClose={() => setHistoryOpen(false)}
            onOpen={openSavedReading}
          />,
          document.body,
        )}
    </>
  );
}

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
}

function ChatPanel({
  onClose,
  categoryId,
  categoryName,
  name,
  gender,
  birthDate,
  birthTime,
  reportContext,
}: {
  onClose: () => void;
  categoryId?: string;
  categoryName?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  reportContext?: string;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      text: '我是你的專屬命理老師。你可以針對命盤、AI短讀或深度報告追問；我會用 150–350 字幫你把性格、感情、事業、財運與近期選擇講清楚。',
    },
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
      const res = await api.generate('premium_chat', {
        question: text,
        history,
        category: categoryId,
        name,
        gender,
        birth_date: birthDate,
        birth_time: birthTime,
        report_context: reportContext,
      });
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
              <div>
                <span className="block text-sm text-white tracking-widest font-light">命理老師對話</span>
                <span className="mt-0.5 block text-[10px] leading-4 tracking-[0.12em] text-[#A89882]/70">
                  {categoryName ? `${categoryName} 追問` : '命盤／短讀／深度報告追問'}
                </span>
              </div>
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
          <div className="rounded-2xl border border-[#A89882]/20 bg-[#A89882]/[0.06] px-4 py-3 text-xs font-light leading-6 tracking-wide text-slate-300">
            針對你的命盤、短讀與深度報告進行追問；每次回覆會直接點重點，避免寫成長篇報告。
          </div>
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

        <div className="shrink-0 border-t border-white/10 p-3 pb-[calc(var(--safe-bottom)+12px)] sm:p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {CHAT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInput(suggestion)}
                className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-[11px] tracking-[0.12em] text-slate-300 transition-colors hover:border-[#A89882]/50 hover:text-[#A89882]"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-3">
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
              placeholder="追問報告重點…（Enter 送出）"
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
    </div>
  );
}
