import { formatChineseBirthHour, getChineseBirthHour } from './chineseTime.js';
import { formatLunarDateForPrompt, solarToLunar } from './lunarCalendar.js';
import {
  buildBaziChart,
  formatBaziDetails,
  formatBaziPillars,
  formatBaziWuXing,
  type BaziChart,
} from './baziChart.js';
import {
  buildZiweiChart,
  findZiweiPalace,
  formatZiweiDetails,
  formatZiweiPalaceSummary,
  type ZiweiChart,
} from './ziweiChart.js';

export interface FortuneChartInput {
  category?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  birthTimezone?: string;
}

export interface FortuneChartFact {
  label: string;
  value: string;
  source: 'user' | 'system';
}

export interface FortuneChartData {
  facts: FortuneChartFact[];
  notes: string[];
  bazi?: BaziChart;
  ziwei?: ZiweiChart;
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

function categoryNotes(
  category: string | undefined,
  bazi: BaziChart | null,
  ziwei: ZiweiChart | null,
  input: FortuneChartInput,
): string[] {
  switch (category) {
    case 'bazi':
      if (!input.birthDate || !input.birthTime) {
        return ['八字四柱需完整出生日期與出生時間；資料未齊時只能做保守通則解讀。'];
      }
      return bazi
          ? [
            '八字四柱已由系統排盤引擎依節氣、日柱與出生時辰排出，解讀時必須以系統四柱為準。',
            '八字採晚子時換日規則；23:00-23:59 會按次日干支計算。',
            bazi.luckDirection
              ? '大運順逆、起運時間與大運干支已由系統排出，可作為報告判讀依據。'
              : '使用者未提供性別，系統只能排出四柱，暫不排大運順逆與起運。',
          ]
        : ['八字排盤資料無法產生，請提醒使用者確認出生日期與時間格式。'];
    case 'ziwei':
      if (!input.birthDate || !input.birthTime || !input.gender) {
        return ['紫微斗數完整排盤需出生日期、出生時間與性別；資料未齊時不可虛構十二宮或主星落點。'];
      }
      return ziwei
          ? [
            '紫微十二宮、命宮、身宮、五行局、主星、輔星與四化已由系統排盤引擎產生，解讀時必須以系統星曜落宮為準。',
            '紫微採通行安星法與晚子時換日規則；23:00-23:59 會按次日盤處理。',
            '紫微斗數流派眾多；本系統目前使用通行排盤法，若使用者指定流派，需再另行校盤。',
          ]
        : ['紫微排盤資料無法產生，請提醒使用者確認出生日期、出生時間與性別格式。'];
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

function addFact(facts: FortuneChartFact[], label: string, value: string | null | undefined): void {
  if (!value) return;
  facts.push({ label, value, source: 'system' });
}

export function buildFortuneChartData(input: FortuneChartInput): FortuneChartData {
  const facts: FortuneChartFact[] = [
    { label: '姓名', value: clean(input.name) ?? '未提供', source: 'user' },
    { label: '性別', value: clean(input.gender) ?? '未提供', source: 'user' },
    { label: '出生國曆', value: formatSolarDate(input.birthDate) ?? '未提供', source: 'user' },
    { label: '出生地', value: clean(input.birthPlace) ?? '未提供', source: 'user' },
    { label: '出生時區', value: clean(input.birthTimezone) ?? '未提供', source: 'user' },
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
  const bazi = buildBaziChart({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    gender: input.gender,
  });
  const ziwei = buildZiweiChart({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    gender: input.gender,
  });
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

  if (bazi) {
    const lunarMatchesBazi = Boolean(
      lunar &&
        lunar.year === bazi.lunarDate.year &&
        lunar.month === bazi.lunarDate.month &&
        lunar.day === bazi.lunarDate.day &&
        lunar.isLeapMonth === bazi.lunarDate.isLeapMonth,
    );
    addFact(
      facts,
      '農曆交叉校驗',
      lunarMatchesBazi
        ? '一致：農曆換算與八字排盤引擎結果相同'
        : '警示：農曆換算與八字排盤引擎結果不一致，請停止解讀並重新校盤',
    );
    addFact(facts, '八字排盤規則', bazi.calculationRule);
    addFact(facts, '八字四柱', formatBaziPillars(bazi));
    addFact(facts, '八字日主', `${bazi.dayMaster}${bazi.dayMasterElement}`);
    addFact(facts, '八字五行分布', formatBaziWuXing(bazi));
    addFact(
      facts,
      '八字命宮身宮',
      `命宮${bazi.mingGong}（${bazi.mingGongNaYin}），身宮${bazi.shenGong}（${bazi.shenGongNaYin}）`,
    );
    addFact(
      facts,
      '八字大運起運',
      bazi.luckDirection && bazi.luckStart
        ? `${bazi.luckDirection}，${bazi.luckStart}`
        : '需提供性別才能計算大運順逆與起運',
    );
    if (input.category === 'bazi') {
      addFact(facts, '八字完整排盤', formatBaziDetails(bazi));
    }
  } else if (input.category === 'bazi') {
    addFact(facts, '八字排盤狀態', '需完整出生日期與出生時間才能排出四柱。');
  }

  if (ziwei) {
    addFact(facts, '紫微排盤規則', ziwei.calculationRule);
    const soulPalace = findZiweiPalace(ziwei, '命宮');
    addFact(
      facts,
      '紫微命宮',
      `命宮在${ziwei.soulPalaceBranch}，身宮在${ziwei.bodyPalaceBranch}，命主${ziwei.soul}，身主${ziwei.body}，五行局${ziwei.fiveElementsClass}`,
    );
    addFact(facts, '紫微命宮主星', formatZiweiPalaceSummary(soulPalace));
    addFact(facts, '紫微官祿宮', formatZiweiPalaceSummary(findZiweiPalace(ziwei, '官祿')));
    addFact(facts, '紫微財帛宮', formatZiweiPalaceSummary(findZiweiPalace(ziwei, '財帛')));
    addFact(facts, '紫微夫妻宮', formatZiweiPalaceSummary(findZiweiPalace(ziwei, '夫妻')));
    if (input.category === 'ziwei') {
      addFact(facts, '紫微十二宮星曜', formatZiweiDetails(ziwei));
    }
  } else if (input.category === 'ziwei') {
    addFact(facts, '紫微排盤狀態', '需完整出生日期、出生時間與性別才能排出紫微十二宮。');
  }

  return {
    facts,
    notes: categoryNotes(input.category, bazi, ziwei, input),
    bazi: bazi ?? undefined,
    ziwei: ziwei ?? undefined,
  };
}

export function formatFortuneChartForPrompt(chart: FortuneChartData): string {
  const factLines = chart.facts.flatMap((fact) => {
    if (!fact.value.includes('\n')) return [`- ${fact.label}：${fact.value}`];
    return [`- ${fact.label}：`, ...fact.value.split('\n').map((line) => `  ${line}`)];
  });
  const lines = [
    '【系統排盤資料】',
    '以下資料由程式先行換算，解讀時必須直接採用；不可自行重算、改寫或補成另一套日期與時辰。',
    ...factLines,
  ];

  if (chart.notes.length) {
    lines.push('【排盤使用限制】');
    lines.push(...chart.notes.map((note) => `- ${note}`));
  }

  return lines.join('\n');
}
