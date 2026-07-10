import { describe, expect, it } from 'vitest';
import { formatLunarDateForPrompt, solarToLunar } from './lunarCalendar';

describe('lunar calendar conversion', () => {
  it('converts the reported ziwei birthday case correctly', () => {
    expect(solarToLunar('1983-06-08')).toEqual({
      year: 1983,
      month: 4,
      day: 27,
      isLeapMonth: false,
      yearGanZhi: '癸亥',
      zodiac: '豬',
    });
    expect(formatLunarDateForPrompt('1983-06-08')).toContain('癸亥年四月廿七日');
  });

  it('rejects invalid or unsupported dates', () => {
    expect(solarToLunar('1983-02-31')).toBeNull();
    expect(solarToLunar('1899-12-31')).toBeNull();
  });
});
