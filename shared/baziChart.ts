import { Solar } from 'lunar-typescript';

export interface BaziPillar {
  label: '年柱' | '月柱' | '日柱' | '時柱';
  ganZhi: string;
  stem: string;
  branch: string;
  hiddenStems: string[];
  wuXing: string;
  naYin: string;
  tenGodStem: string;
  tenGodBranch: string[];
  diShi: string;
  xun: string;
  xunKong: string;
}

export interface BaziLuckPeriod {
  ganZhi: string;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  xun: string;
  xunKong: string;
}

export interface BaziChart {
  lunarDate: {
    year: number;
    month: number;
    day: number;
    isLeapMonth: boolean;
  };
  calculationRule: string;
  pillars: BaziPillar[];
  dayMaster: string;
  dayMasterElement: string;
  wuXingDistribution: Record<'木' | '火' | '土' | '金' | '水', number>;
  mingGong: string;
  mingGongNaYin: string;
  shenGong: string;
  shenGongNaYin: string;
  taiYuan: string;
  taiYuanNaYin: string;
  taiXi: string;
  taiXiNaYin: string;
  luckDirection?: '順行' | '逆行';
  luckStart?: string;
  luckPeriods: BaziLuckPeriod[];
}

const ELEMENTS = ['木', '火', '土', '金', '水'] as const;

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

function genderToNumber(gender: string | undefined): 0 | 1 | null {
  const normalized = gender?.trim().toLowerCase();
  if (!normalized) return null;
  if (['男', '男性', 'male', 'm'].includes(normalized)) return 1;
  if (['女', '女性', 'female', 'f'].includes(normalized)) return 0;
  return null;
}

function pillar(
  label: BaziPillar['label'],
  ganZhi: string,
  stem: string,
  branch: string,
  hiddenStems: string[],
  wuXing: string,
  naYin: string,
  tenGodStem: string,
  tenGodBranch: string[],
  diShi: string,
  xun: string,
  xunKong: string,
): BaziPillar {
  return {
    label,
    ganZhi,
    stem,
    branch,
    hiddenStems,
    wuXing,
    naYin,
    tenGodStem,
    tenGodBranch,
    diShi,
    xun,
    xunKong,
  };
}

function formatSolarYmdHms(solar: Solar): string {
  const date = solar.toYmdHms();
  const [ymd, hms] = date.split(' ');
  const [year, month, day] = ymd.split('-').map(Number);
  return `${year}年${month}月${day}日 ${hms}`;
}

function countWuXing(pillars: BaziPillar[]): BaziChart['wuXingDistribution'] {
  const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const item of pillars) {
    for (const char of item.wuXing) {
      if (ELEMENTS.includes(char as (typeof ELEMENTS)[number])) {
        counts[char as keyof typeof counts] += 1;
      }
    }
  }
  return counts;
}

function formatLuckStart(
  startYear: number,
  startMonth: number,
  startDay: number,
  startHour: number,
  startSolar: Solar,
): string {
  return `${startYear}年${startMonth}個月${startDay}日${startHour}小時後起運（約 ${formatSolarYmdHms(
    startSolar,
  )}）`;
}

export function buildBaziChart(input: {
  birthDate?: string;
  birthTime?: string;
  gender?: string;
}): BaziChart | null {
  if (!input.birthDate || !input.birthTime) return null;

  const solarDate = parseSolarDate(input.birthDate);
  const birthTime = parseBirthTime(input.birthTime);
  if (!solarDate || !birthTime) return null;

  const solar = Solar.fromYmdHms(
    solarDate.year,
    solarDate.month,
    solarDate.day,
    birthTime.hour,
    birthTime.minute,
    0,
  );
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  // Sect 1 uses 23:00 as the next day boundary, matching the ziwei engine's
  // explicit late-rat-hour forward rule.
  eightChar.setSect(1);

  const pillars: BaziPillar[] = [
    pillar(
      '年柱',
      eightChar.getYear(),
      eightChar.getYearGan(),
      eightChar.getYearZhi(),
      eightChar.getYearHideGan(),
      eightChar.getYearWuXing(),
      eightChar.getYearNaYin(),
      eightChar.getYearShiShenGan(),
      eightChar.getYearShiShenZhi(),
      eightChar.getYearDiShi(),
      eightChar.getYearXun(),
      eightChar.getYearXunKong(),
    ),
    pillar(
      '月柱',
      eightChar.getMonth(),
      eightChar.getMonthGan(),
      eightChar.getMonthZhi(),
      eightChar.getMonthHideGan(),
      eightChar.getMonthWuXing(),
      eightChar.getMonthNaYin(),
      eightChar.getMonthShiShenGan(),
      eightChar.getMonthShiShenZhi(),
      eightChar.getMonthDiShi(),
      eightChar.getMonthXun(),
      eightChar.getMonthXunKong(),
    ),
    pillar(
      '日柱',
      eightChar.getDay(),
      eightChar.getDayGan(),
      eightChar.getDayZhi(),
      eightChar.getDayHideGan(),
      eightChar.getDayWuXing(),
      eightChar.getDayNaYin(),
      eightChar.getDayShiShenGan(),
      eightChar.getDayShiShenZhi(),
      eightChar.getDayDiShi(),
      eightChar.getDayXun(),
      eightChar.getDayXunKong(),
    ),
    pillar(
      '時柱',
      eightChar.getTime(),
      eightChar.getTimeGan(),
      eightChar.getTimeZhi(),
      eightChar.getTimeHideGan(),
      eightChar.getTimeWuXing(),
      eightChar.getTimeNaYin(),
      eightChar.getTimeShiShenGan(),
      eightChar.getTimeShiShenZhi(),
      eightChar.getTimeDiShi(),
      eightChar.getTimeXun(),
      eightChar.getTimeXunKong(),
    ),
  ];

  const genderNumber = genderToNumber(input.gender);
  const yun = genderNumber === null ? null : eightChar.getYun(genderNumber);
  const luckPeriods = yun
    ? yun
        .getDaYun(10)
        .filter((item) => item.getGanZhi())
        .map((item) => ({
          ganZhi: item.getGanZhi(),
          startYear: item.getStartYear(),
          endYear: item.getEndYear(),
          startAge: item.getStartAge(),
          endAge: item.getEndAge(),
          xun: item.getXun(),
          xunKong: item.getXunKong(),
        }))
    : [];

  return {
    lunarDate: {
      year: lunar.getYear(),
      month: Math.abs(lunar.getMonth()),
      day: lunar.getDay(),
      isLeapMonth: lunar.getMonth() < 0,
    },
    calculationRule: '節氣定年月柱、晚子時換日（23:00 起按次日）、當地鐘錶時間',
    pillars,
    dayMaster: eightChar.getDayGan(),
    dayMasterElement: eightChar.getDayWuXing().charAt(0),
    wuXingDistribution: countWuXing(pillars),
    mingGong: eightChar.getMingGong(),
    mingGongNaYin: eightChar.getMingGongNaYin(),
    shenGong: eightChar.getShenGong(),
    shenGongNaYin: eightChar.getShenGongNaYin(),
    taiYuan: eightChar.getTaiYuan(),
    taiYuanNaYin: eightChar.getTaiYuanNaYin(),
    taiXi: eightChar.getTaiXi(),
    taiXiNaYin: eightChar.getTaiXiNaYin(),
    luckDirection: yun ? (yun.isForward() ? '順行' : '逆行') : undefined,
    luckStart: yun
      ? formatLuckStart(
          yun.getStartYear(),
          yun.getStartMonth(),
          yun.getStartDay(),
          yun.getStartHour(),
          yun.getStartSolar(),
        )
      : undefined,
    luckPeriods,
  };
}

export function formatBaziPillars(chart: BaziChart): string {
  return chart.pillars.map((item) => `${item.label}${item.ganZhi}`).join('｜');
}

export function formatBaziWuXing(chart: BaziChart): string {
  return ELEMENTS.map((element) => `${element}${chart.wuXingDistribution[element]}`).join('、');
}

export function formatBaziDetails(chart: BaziChart): string {
  const pillarLines = chart.pillars.map((item) =>
    [
      `${item.label} ${item.ganZhi}`,
      `天干${item.stem}`,
      `地支${item.branch}`,
      `藏干${item.hiddenStems.join('、') || '無'}`,
      `十神${item.tenGodStem}/${item.tenGodBranch.join('、') || '無'}`,
      `五行${item.wuXing}`,
      `納音${item.naYin}`,
      `十二長生${item.diShi}`,
      `旬空${item.xunKong}`,
    ].join('；'),
  );
  const luckLines = chart.luckPeriods.slice(0, 8).map(
    (item) =>
      `${item.ganZhi}：${item.startAge}-${item.endAge}歲（${item.startYear}-${item.endYear}），旬空${item.xunKong}`,
  );

  return [
    ...pillarLines,
    `日主：${chart.dayMaster}${chart.dayMasterElement}`,
    `排盤規則：${chart.calculationRule}`,
    `五行分布：${formatBaziWuXing(chart)}`,
    `命宮：${chart.mingGong}（${chart.mingGongNaYin}）；身宮：${chart.shenGong}（${chart.shenGongNaYin}）`,
    `胎元：${chart.taiYuan}（${chart.taiYuanNaYin}）；胎息：${chart.taiXi}（${chart.taiXiNaYin}）`,
    chart.luckDirection && chart.luckStart
      ? `大運：${chart.luckDirection}，${chart.luckStart}`
      : '大運：需提供性別才能計算順逆與起運',
    luckLines.length ? `大運列表：${luckLines.join('｜')}` : '大運列表：未排出',
  ].join('\n');
}
