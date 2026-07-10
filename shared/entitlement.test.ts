import { describe, it, expect } from 'vitest';
import { checkEntitlement, effectivePlan } from './entitlement';

describe('effectivePlan', () => {
  it('downgrades non-active paid plans to free', () => {
    expect(effectivePlan('pro_monthly', 'pending')).toBe('free');
    expect(effectivePlan('pro_monthly', 'cancelled')).toBe('free');
    expect(effectivePlan('master_monthly', 'active')).toBe('master_monthly');
    expect(effectivePlan('pro_monthly', 'manual_active')).toBe('pro_monthly');
  });

  it('downgrades active paid plans after current period end', () => {
    expect(effectivePlan('pro_monthly', 'manual_active', '2000-01-01T00:00:00.000Z')).toBe('free');
    expect(effectivePlan('pro_monthly', 'manual_active', '2999-01-01T00:00:00.000Z')).toBe('pro_monthly');
  });
});

describe('checkEntitlement - premium reports', () => {
  it('free users cannot generate premium reports', () => {
    const r = checkEntitlement({ plan: 'free', status: 'none', usage: 'premium_report', used: 0 });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('plan_required');
  });

  it('pro users get exactly 2 premium reports per month', () => {
    const ok = checkEntitlement({ plan: 'pro_monthly', status: 'active', usage: 'premium_report', used: 1 });
    expect(ok.allowed).toBe(true);
    const blocked = checkEntitlement({ plan: 'pro_monthly', status: 'active', usage: 'premium_report', used: 2 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe('quota_exhausted');
  });

  it('manual admin grants unlock paid AI usage until the period expires', () => {
    const ok = checkEntitlement({
      plan: 'pro_monthly',
      status: 'manual_active',
      currentPeriodEnd: '2999-01-01T00:00:00.000Z',
      usage: 'premium_report',
      used: 0,
    });
    const expired = checkEntitlement({
      plan: 'pro_monthly',
      status: 'manual_active',
      currentPeriodEnd: '2000-01-01T00:00:00.000Z',
      usage: 'premium_report',
      used: 0,
    });

    expect(ok.allowed).toBe(true);
    expect(expired.allowed).toBe(false);
    expect(expired.reason).toBe('plan_required');
  });

  it('master users get exactly 8 premium reports per month', () => {
    expect(
      checkEntitlement({ plan: 'master_monthly', status: 'active', usage: 'premium_report', used: 7 }).allowed,
    ).toBe(true);
    expect(
      checkEntitlement({ plan: 'master_monthly', status: 'active', usage: 'premium_report', used: 8 }).allowed,
    ).toBe(false);
  });
});

describe('checkEntitlement - short readings', () => {
  it('free = 3 / pro = 30 / master = 100 per month', () => {
    expect(checkEntitlement({ plan: 'free', status: 'none', usage: 'short_reading', used: 2 }).allowed).toBe(true);
    expect(checkEntitlement({ plan: 'free', status: 'none', usage: 'short_reading', used: 3 }).allowed).toBe(false);
    expect(checkEntitlement({ plan: 'pro_monthly', status: 'active', usage: 'short_reading', used: 29 }).allowed).toBe(true);
    expect(checkEntitlement({ plan: 'master_monthly', status: 'active', usage: 'short_reading', used: 99 }).allowed).toBe(true);
  });
});
