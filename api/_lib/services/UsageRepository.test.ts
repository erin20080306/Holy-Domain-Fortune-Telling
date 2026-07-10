import { describe, expect, it } from 'vitest';
import { getUsageBucketKey } from './UsageRepository';

describe('getUsageBucketKey', () => {
  it('uses daily tarot buckets for free users and monthly buckets for paid users', () => {
    const date = new Date('2026-07-10T02:30:00.000Z');

    expect(getUsageBucketKey('tarot', date, 'free')).toBe('2026-07-10');
    expect(getUsageBucketKey('tarot', date, 'pro_monthly')).toBe('2026-07');
    expect(getUsageBucketKey('tarot', date, 'master_monthly')).toBe('2026-07');
  });

  it('keeps non-tarot usage monthly', () => {
    const date = new Date('2026-07-10T02:30:00.000Z');

    expect(getUsageBucketKey('short_reading', date, 'free')).toBe('2026-07');
    expect(getUsageBucketKey('premium_report', date, 'pro_monthly')).toBe('2026-07');
  });
});
