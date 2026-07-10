const BRANCH_HOURS = [
  { branch: '子', range: '23:00-00:59' },
  { branch: '丑', range: '01:00-02:59' },
  { branch: '寅', range: '03:00-04:59' },
  { branch: '卯', range: '05:00-06:59' },
  { branch: '辰', range: '07:00-08:59' },
  { branch: '巳', range: '09:00-10:59' },
  { branch: '午', range: '11:00-12:59' },
  { branch: '未', range: '13:00-14:59' },
  { branch: '申', range: '15:00-16:59' },
  { branch: '酉', range: '17:00-18:59' },
  { branch: '戌', range: '19:00-20:59' },
  { branch: '亥', range: '21:00-22:59' },
] as const;

export const CHINESE_HOUR_RULE_TEXT = BRANCH_HOURS.map(
  (item) => `${item.branch}時${item.range}`,
).join('、');

export interface ChineseBirthHour {
  branch: string;
  label: string;
  range: string;
}

function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
}

export function getChineseBirthHour(time: string): ChineseBirthHour | null {
  const parsed = parseTime(time);
  if (!parsed) return null;

  const index = Math.floor(((parsed.hour + 1) % 24) / 2);
  const item = BRANCH_HOURS[index];
  return {
    branch: item.branch,
    label: `${item.branch}時`,
    range: item.range,
  };
}

export function formatChineseBirthHour(time: string): string | null {
  const birthHour = getChineseBirthHour(time);
  if (!birthHour) return null;

  return `${birthHour.label}（${birthHour.range}）`;
}

export function formatChineseBirthHourInline(time: string): string | null {
  const birthHour = getChineseBirthHour(time);
  if (!birthHour) return null;

  return `${birthHour.label}，${birthHour.range}`;
}
