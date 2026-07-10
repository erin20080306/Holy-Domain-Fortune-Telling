import { describe, expect, it } from 'vitest';
import {
  formatChineseBirthHour,
  formatChineseBirthHourInline,
  getChineseBirthHour,
} from './chineseTime';

describe('Chinese birth hour conversion', () => {
  it('maps 03:30 to yin hour', () => {
    expect(getChineseBirthHour('03:30')).toMatchObject({
      branch: '寅',
      label: '寅時',
      range: '03:00-04:59',
    });
    expect(formatChineseBirthHour('03:30')).toBe('寅時（03:00-04:59）');
    expect(formatChineseBirthHourInline('03:30')).toBe('寅時，03:00-04:59');
  });

  it('uses the traditional two-hour boundaries', () => {
    expect(getChineseBirthHour('00:59')?.label).toBe('子時');
    expect(getChineseBirthHour('01:00')?.label).toBe('丑時');
    expect(getChineseBirthHour('02:59')?.label).toBe('丑時');
    expect(getChineseBirthHour('03:00')?.label).toBe('寅時');
    expect(getChineseBirthHour('04:59')?.label).toBe('寅時');
    expect(getChineseBirthHour('05:00')?.label).toBe('卯時');
    expect(getChineseBirthHour('23:00')?.label).toBe('子時');
  });

  it('rejects invalid times', () => {
    expect(getChineseBirthHour('24:00')).toBeNull();
    expect(getChineseBirthHour('03:60')).toBeNull();
    expect(getChineseBirthHour('am 3:30')).toBeNull();
  });
});
