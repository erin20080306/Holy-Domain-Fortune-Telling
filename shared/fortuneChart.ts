import { formatChineseBirthHour, getChineseBirthHour } from './chineseTime';
import { formatLunarDateForPrompt, solarToLunar } from './lunarCalendar';

export interface FortuneChartInput {
  category?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
}

export interface FortuneChartFact {
  label: string;
  value: string;
  source: 'user' | 'system';
}

export interface FortuneChartData {
  facts: FortuneChartFact[];
  notes: string[];
}

const MASTER_NUMBERS = new Set([11, 22, 33]);

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseSolarDate(value: string | undefined): { year: number; month: number; day: number } | null {
  const trimmed = clean(value);
  if (!trimmed) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function formatSolarDate(value: string | undefined): string | null {
  const date = parseSolarDate(value);
  if (!date) return null;
  return `${date.year}年${date.month}月${date.day}日（國曆 ${value}）`;
}

function reduceNumerologyNumber(value: number): { final: number; steps: string[] } {
  const steps: string[] = [];
  let current = value;

  while (current > 9 && !MASTER_NUMBERS.has(current)) {
    const digits = String(current).split('').map(Number);
    const next = digits.reduce((sum, digit) => sum + digit, 0);
    steps.push(`${digits.join('+')} = ${next}`);
    current = next;
  }

  return { final: current, steps };
}

function buildLifePathNumber(birthDate: string | undefined): string | null {
  const parsed = parseSolarDate(birthDate);
  if (!parsed || !birthDate) return null;

  const digits = birthDate.replace(/\D/g, '').split('').map(Number);
  const total = digits.reduce((sum, digit) => sum + digit, 0);
  const reduced = reduceNumerologyNumber(total);
  const formula = [`${digits.join('+')} = ${total}`, ...reduced.steps].join('；');

  return `${reduced.final}（計算式：${formula}）`;
}

function categoryNotes(category: string | undefined): string[] {
  switch (category) {
    case 'bazi':
      return [
        '目前系統已提供可驗證的出生國曆、農曆、生肖、農曆年干支與命理時辰。',
        '完整八字四柱、節氣月柱、日柱、時柱天干與大運起運歲數尚未由系統排出，解讀時不得把未提供的四柱或大運寫成確定結果。',
      ];
    case 'ziwei':
      return [
        '目前系統已提供紫微斗數必用的出生農曆生日與命理時辰，解讀時必須直接採用。',
        '完整紫微十二宮、命宮身宮與星曜落宮尚未由系統排出，解讀時不得虛構主星、四化或宮位落點。',
      ];
    case 'zodiac':
      return ['生肖與農曆年干支由系統依農曆生日換算，不以單純陽曆年份粗判。'];
    case 'numerology':
      return ['生命靈數由系統依陽曆生日全數字加總並化約，命理老師只負責解讀數字含義。'];
    case 'astro':
    case 'humandesign':
      return ['目前系統會固定出生日期與時間資料；若沒有出生地或精密星盤資料，請保守解讀上升、宮位與人類圖類型。'];
    default:
      return ['命理硬資料由系統先行換算，後續解讀必須以這些資料為準，不可自行改寫出生日期、農曆或時辰。'];
  }
}

export function buildFortuneChartData(input: FortuneChartInput): FortuneChartData {
  const facts: FortuneChartFact[] = [
    { label: '姓名', value: clean(input.name) ?? '未提供', source: 'user' },
    { label: '性別', value: clean(input.gender) ?? '未提供', source: 'user' },
    { label: '出生國曆', value: formatSolarDate(input.birthDate) ?? '未提供', source: 'user' },
    { label: '出生地', value: clean(input.birthPlace) ?? '未提供', source: 'user' },
  ];

  const lunar = input.birthDate ? solarToLunar(input.birthDate) : null;
  const lunarText = input.birthDate ? formatLunarDateForPrompt(input.birthDate) : null;
  facts.push({
    label: '出生農曆',
    value: lunarText ?? (input.birthDate ? '系統暫不支援此日期換算' : '未提供'),
    source: 'system',
  });

  facts.push({
    label: '生肖',
    value: lunar?.zodiac ?? '未提供',
    source: 'system',
  });

  facts.push({
    label: '農曆年干支',
    value: lunar?.yearGanZhi ? `${lunar.yearGanZhi}年` : '未提供',
    source: 'system',
  });

  const birthHour = input.birthTime ? formatChineseBirthHour(input.birthTime) : null;
  const birthHourBranch = input.birthTime ? getChineseBirthHour(input.birthTime)?.branch : null;
  facts.push({
    label: '出生時間',
    value: clean(input.birthTime) ?? '未提供',
    source: 'user',
  });
  facts.push({
    label: '命理時辰',
    value: birthHour ?? (input.birthTime ? '時間格式無法換算' : '未提供'),
    source: 'system',
  });
  facts.push({
    label: '時辰地支',
    value: birthHourBranch ? `${birthHourBranch}（時支）` : '未提供',
    source: 'system',
  });

  facts.push({
    label: '生命靈數',
    value: buildLifePathNumber(input.birthDate) ?? '未提供',
    source: 'system',
  });

  return {
    facts,
    notes: categoryNotes(input.category),
  };
}

export function formatFortuneChartForPrompt(chart: FortuneChartData): string {
  const lines = [
    '【系統排盤資料】',
    '以下資料由程式先行換算，解讀時必須直接採用；不可自行重算、改寫或補成另一套日期與時辰。',
    ...chart.facts.map((fact) => `- ${fact.label}：${fact.value}`),
  ];

  if (chart.notes.length) {
    lines.push('【排盤使用限制】');
    lines.push(...chart.notes.map((note) => `- ${note}`));
  }

  return lines.join('\n');
}
