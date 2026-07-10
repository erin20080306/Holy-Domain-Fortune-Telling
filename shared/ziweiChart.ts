import { astro } from 'iztro';

export interface ZiweiStar {
  name: string;
  brightness?: string;
  mutagen?: string;
}

export interface ZiweiPalace {
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  majorStars: ZiweiStar[];
  minorStars: ZiweiStar[];
  adjectiveStars: ZiweiStar[];
  changsheng12: string;
  boshi12: string;
  jiangqian12: string;
  suiqian12: string;
  decadalRange: [number, number];
}

export interface ZiweiChart {
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  time: string;
  timeRange: string;
  sign: string;
  zodiac: string;
  soulPalaceBranch: string;
  bodyPalaceBranch: string;
  soul: string;
  body: string;
  fiveElementsClass: string;
  palaces: ZiweiPalace[];
}

function parseSolarDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
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

function parseBirthTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

function genderForZiwei(gender: string | undefined): '男' | '女' | null {
  const normalized = gender?.trim().toLowerCase();
  if (!normalized) return null;
  if (['男', '男性', 'male', 'm'].includes(normalized)) return '男';
  if (['女', '女性', 'female', 'f'].includes(normalized)) return '女';
  return null;
}

export function ziweiTimeIndex(time: string | undefined): number | null {
  if (!time) return null;
  const parsed = parseBirthTime(time);
  if (!parsed) return null;

  if (parsed.hour === 23) return 12;
  if (parsed.hour === 0) return 0;
  return Math.floor((parsed.hour + 1) / 2);
}

function formatSolarForZiwei(value: string): string | null {
  const date = parseSolarDate(value);
  if (!date) return null;
  return `${date.year}-${date.month}-${date.day}`;
}

function normalizeStar(star: { name: string; brightness?: string; mutagen?: string }): ZiweiStar {
  return {
    name: star.name,
    brightness: star.brightness,
    mutagen: star.mutagen,
  };
}

export function formatZiweiStars(stars: ZiweiStar[]): string {
  if (!stars.length) return '無';
  return stars
    .map((star) => {
      const brightness = star.brightness ? `(${star.brightness})` : '';
      const mutagen = star.mutagen ? `[${star.mutagen}]` : '';
      return `${star.name}${brightness}${mutagen}`;
    })
    .join('、');
}

export function buildZiweiChart(input: {
  birthDate?: string;
  birthTime?: string;
  gender?: string;
}): ZiweiChart | null {
  if (!input.birthDate || !input.birthTime) return null;

  const solarDate = formatSolarForZiwei(input.birthDate);
  const timeIndex = ziweiTimeIndex(input.birthTime);
  const gender = genderForZiwei(input.gender);
  if (!solarDate || timeIndex === null || !gender) return null;

  const astrolabe = astro.bySolar(solarDate, timeIndex, gender, true, 'zh-TW');
  return {
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    chineseDate: astrolabe.chineseDate,
    time: astrolabe.time,
    timeRange: astrolabe.timeRange,
    sign: astrolabe.sign,
    zodiac: astrolabe.zodiac,
    soulPalaceBranch: astrolabe.earthlyBranchOfSoulPalace,
    bodyPalaceBranch: astrolabe.earthlyBranchOfBodyPalace,
    soul: astrolabe.soul,
    body: astrolabe.body,
    fiveElementsClass: astrolabe.fiveElementsClass,
    palaces: astrolabe.palaces.map((palace) => ({
      index: palace.index,
      name: palace.name,
      heavenlyStem: palace.heavenlyStem,
      earthlyBranch: palace.earthlyBranch,
      isBodyPalace: palace.isBodyPalace,
      isOriginalPalace: palace.isOriginalPalace,
      majorStars: palace.majorStars.map(normalizeStar),
      minorStars: palace.minorStars.map(normalizeStar),
      adjectiveStars: palace.adjectiveStars.map(normalizeStar),
      changsheng12: palace.changsheng12,
      boshi12: palace.boshi12,
      jiangqian12: palace.jiangqian12,
      suiqian12: palace.suiqian12,
      decadalRange: palace.decadal.range,
    })),
  };
}

export function findZiweiPalace(chart: ZiweiChart, name: string): ZiweiPalace | undefined {
  return chart.palaces.find((palace) => palace.name === name);
}

export function formatZiweiPalaceSummary(palace: ZiweiPalace | undefined): string {
  if (!palace) return '未排出';
  return `${palace.name}（${palace.heavenlyStem}${palace.earthlyBranch}${
    palace.isBodyPalace ? '，身宮' : ''
  }）：主星${formatZiweiStars(palace.majorStars)}；輔星${formatZiweiStars(
    palace.minorStars.slice(0, 6),
  )}`;
}

export function formatZiweiDetails(chart: ZiweiChart): string {
  const palaceLines = chart.palaces.map((palace) => {
    const palaceTitle = palace.name.endsWith('宮') ? palace.name : `${palace.name}宮`;
    return [
      `${palaceTitle} ${palace.heavenlyStem}${palace.earthlyBranch}${palace.isBodyPalace ? '（身宮）' : ''}`,
      `主星${formatZiweiStars(palace.majorStars)}`,
      `輔星${formatZiweiStars(palace.minorStars)}`,
      `雜曜${formatZiweiStars(palace.adjectiveStars.slice(0, 8))}`,
      `長生${palace.changsheng12}`,
      `博士${palace.boshi12}`,
      `將前${palace.jiangqian12}`,
      `歲前${palace.suiqian12}`,
      `大限${palace.decadalRange[0]}-${palace.decadalRange[1]}歲`,
    ].join('；');
  });

  return [
    `命宮地支：${chart.soulPalaceBranch}；身宮地支：${chart.bodyPalaceBranch}`,
    `命主：${chart.soul}；身主：${chart.body}；五行局：${chart.fiveElementsClass}`,
    `紫微農曆：${chart.lunarDate}；干支日期：${chart.chineseDate}；時辰：${chart.time}（${chart.timeRange}）`,
    ...palaceLines,
  ].join('\n');
}
