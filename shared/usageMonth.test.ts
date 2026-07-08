import { describe, it, expect } from 'vitest';
import { getTaipeiUsageMonth, getTaipeiDayKey } from './usageMonth';

describe('Taipei usage month keying (cross-device stable)', () => {
  it('uses UTC+8 boundary', () => {
    // 2024-01-31 23:00 UTC -> 2024-02-01 07:00 Taipei
    expect(getTaipeiUsageMonth(new Date('2024-01-31T23:00:00Z'))).toBe('2024-02');
    // 2024-02-01 15:00 UTC -> 2024-02-01 23:00 Taipei
    expect(getTaipeiUsageMonth(new Date('2024-02-01T15:00:00Z'))).toBe('2024-02');
    // 2024-01-31 15:00 UTC -> 2024-01-31 23:00 Taipei (still Jan)
    expect(getTaipeiUsageMonth(new Date('2024-01-31T15:00:00Z'))).toBe('2024-01');
  });

  it('day key rolls over at Taipei midnight', () => {
    expect(getTaipeiDayKey(new Date('2024-01-31T16:00:00Z'))).toBe('2024-02-01');
  });
});
