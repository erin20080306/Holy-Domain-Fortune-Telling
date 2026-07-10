const START_YEAR = 1900;
const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_SOLAR_DATE = Date.UTC(1900, 0, 31);

// Encoded Chinese lunisolar calendar data for 1900-2100.
// Lower 4 bits: leap month. Bit 16: leap month has 30 days. Bits 15-4:
// regular month lengths from month 1 to 12, where 1 means 30 days.
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0,
  0x055d2, 0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2,
  0x095b0, 0x14977, 0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60,
  0x09570, 0x052f2, 0x04970, 0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60,
  0x186e3, 0x092e0, 0x1c8d7, 0x0c950, 0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4,
  0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, 0x06ca0, 0x0b550, 0x15355, 0x04da0,
  0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0, 0x0aea6, 0x0ab50, 0x04b60,
  0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, 0x096d0, 0x04dd5,
  0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, 0x095b0,
  0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5,
  0x092e0, 0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0,
  0x092d0, 0x0cab5, 0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0,
  0x15176, 0x052b0, 0x0a930, 0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6,
  0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, 0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0,
  0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, 0x0b5a0, 0x056d0, 0x055b2, 0x049b0,
  0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, 0x14b63, 0x09370, 0x049f8,
  0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, 0x0a2e0, 0x0d2e3,
  0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, 0x052d0,
  0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4,
  0x0d160, 0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0,
  0x0d150, 0x0f252, 0x0d520,
];

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZODIACS = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
const MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '臘'];
const DAY_NAMES = [
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十',
  '廿一',
  '廿二',
  '廿三',
  '廿四',
  '廿五',
  '廿六',
  '廿七',
  '廿八',
  '廿九',
  '三十',
];

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  yearGanZhi: string;
  zodiac: string;
}

function infoForYear(year: number): number | null {
  const info = LUNAR_INFO[year - START_YEAR];
  return typeof info === 'number' ? info : null;
}

function leapMonth(year: number): number {
  return infoForYear(year) !== null ? LUNAR_INFO[year - START_YEAR] & 0xf : 0;
}

function leapDays(year: number): number {
  if (!leapMonth(year)) return 0;
  return (LUNAR_INFO[year - START_YEAR] & 0x10000) !== 0 ? 30 : 29;
}

function monthDays(year: number, month: number): number {
  return (LUNAR_INFO[year - START_YEAR] & (0x10000 >> month)) !== 0 ? 30 : 29;
}

function yearDays(year: number): number {
  let sum = 348;
  const info = LUNAR_INFO[year - START_YEAR];

  for (let mask = 0x8000; mask > 0x8; mask >>= 1) {
    if ((info & mask) !== 0) sum += 1;
  }

  return sum + leapDays(year);
}

function parseSolarDate(value: string): Date | null {
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

  return date;
}

function ganZhiYear(year: number): string {
  const index = year - 4;
  return `${STEMS[index % 10]}${BRANCHES[index % 12]}`;
}

function zodiacYear(year: number): string {
  return ZODIACS[(year - 4) % 12];
}

export function solarToLunar(solarDate: string): LunarDate | null {
  const date = parseSolarDate(solarDate);
  if (!date) return null;

  let offset = Math.floor((date.getTime() - BASE_SOLAR_DATE) / DAY_MS);
  if (offset < 0) return null;

  for (let year = START_YEAR; year < START_YEAR + LUNAR_INFO.length; year += 1) {
    const daysInYear = yearDays(year);
    if (offset >= daysInYear) {
      offset -= daysInYear;
      continue;
    }

    const leap = leapMonth(year);
    let month = 1;
    let isLeapMonth = false;

    while (month <= 12) {
      const daysInMonth = isLeapMonth ? leapDays(year) : monthDays(year, month);
      if (offset < daysInMonth) {
        return {
          year,
          month,
          day: offset + 1,
          isLeapMonth,
          yearGanZhi: ganZhiYear(year),
          zodiac: zodiacYear(year),
        };
      }

      offset -= daysInMonth;

      if (leap === month && !isLeapMonth) {
        isLeapMonth = true;
      } else {
        isLeapMonth = false;
        month += 1;
      }
    }
  }

  return null;
}

export function formatLunarDateForPrompt(solarDate: string): string | null {
  const lunar = solarToLunar(solarDate);
  if (!lunar) return null;

  const monthName = `${lunar.isLeapMonth ? '閏' : ''}${MONTH_NAMES[lunar.month - 1]}月`;
  const dayName = `${DAY_NAMES[lunar.day - 1]}日`;
  const numeric = `${lunar.year}-${String(lunar.month).padStart(2, '0')}-${String(
    lunar.day,
  ).padStart(2, '0')}`;

  return `${lunar.yearGanZhi}年${monthName}${dayName}（農曆 ${numeric}${
    lunar.isLeapMonth ? '，閏月' : ''
  }，生肖${lunar.zodiac}）`;
}
