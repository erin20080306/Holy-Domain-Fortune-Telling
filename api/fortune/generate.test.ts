import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../_lib/http.js', () => ({
  readRawBody: vi.fn(),
  sendJson: vi.fn((res: any, code: number, body: unknown) => {
    res.statusCode = code;
    res.body = body;
  }),
}));
vi.mock('../_lib/auth.js', () => ({ getAuthedUser: vi.fn() }));
vi.mock('../_lib/services/SubscriptionRepository.js', () => ({ ensureSubscription: vi.fn() }));
vi.mock('../_lib/services/UsageRepository.js', () => ({
  getOrCreateQuota: vi.fn(),
  getUsageBucketKey: vi.fn(),
  incrementUsage: vi.fn(),
  releaseUsage: vi.fn(),
  reserveUsage: vi.fn(),
  usedCount: vi.fn(),
}));
vi.mock('../_lib/env.js', () => ({ planLimitsFromEnv: vi.fn() }));
vi.mock('../../shared/entitlement.js', () => ({
  checkEntitlement: vi.fn(),
  effectivePlan: vi.fn(),
}));
vi.mock('../../shared/productCopy.js', () => ({
  USER_MESSAGES: {
    loginRequired: 'login required',
    analysisBusy: 'busy',
    planRequired: 'plan required',
    quotaExhausted: 'quota exhausted',
  },
}));
vi.mock('../_lib/ai/generateReading.js', () => ({ generateReading: vi.fn() }));
vi.mock('../_lib/services/ReadingHistoryRepository.js', () => ({ saveDeepReport: vi.fn() }));

import handler from './generate';
import { getAuthedUser } from '../_lib/auth';
import { readRawBody } from '../_lib/http';
import { ensureSubscription } from '../_lib/services/SubscriptionRepository';
import {
  getOrCreateQuota,
  getUsageBucketKey,
  incrementUsage,
  releaseUsage,
  reserveUsage,
  usedCount,
} from '../_lib/services/UsageRepository';
import { planLimitsFromEnv } from '../_lib/env';
import { checkEntitlement, effectivePlan } from '../../shared/entitlement';
import { generateReading } from '../_lib/ai/generateReading';

describe('fortune generation quota enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthedUser).mockResolvedValue({
      userId: 'user-1',
      email: 'member@example.com',
      role: 'user',
    });
    vi.mocked(ensureSubscription).mockResolvedValue({
      id: 'subscription-1',
      user_id: 'user-1',
      plan: 'pro_monthly',
      status: 'active',
      source: 'paypal',
      paypal_payer_email: null,
      paypal_subscription_id: null,
      paypal_transaction_id: null,
      current_period_start: null,
      current_period_end: null,
      activated_at: null,
      cancelled_at: null,
      admin_note: null,
      updated_at: '',
    });
    vi.mocked(effectivePlan).mockReturnValue('pro_monthly');
    vi.mocked(getUsageBucketKey).mockReturnValue('2026-07');
    vi.mocked(getOrCreateQuota).mockResolvedValue({} as any);
    vi.mocked(usedCount).mockReturnValue(0);
    vi.mocked(planLimitsFromEnv).mockReturnValue({} as any);
    vi.mocked(checkEntitlement).mockReturnValue({ allowed: true, remaining: 3 } as any);
    vi.mocked(reserveUsage).mockResolvedValue('unavailable');
    vi.mocked(generateReading).mockResolvedValue('reading result');
  });

  it('still consumes quota when the client sends a forged cache hint', async () => {
    vi.mocked(readRawBody).mockResolvedValue(
      Buffer.from(
        JSON.stringify({
          usage_type: 'short_reading',
          category: 'bazi',
          __from_cache: true,
        }),
      ),
    );
    const req = { method: 'POST', headers: {} } as any;
    const res = {} as any;

    await handler(req, res);

    expect(incrementUsage).toHaveBeenCalledTimes(1);
    expect(incrementUsage).toHaveBeenCalledWith('user-1', 'short_reading', '2026-07');
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, content: 'reading result', remaining: 2 });
  });

  it('rejects a concurrent request when the atomic reservation is exhausted', async () => {
    vi.mocked(readRawBody).mockResolvedValue(
      Buffer.from(JSON.stringify({ usage_type: 'short_reading', category: 'bazi' })),
    );
    vi.mocked(reserveUsage).mockResolvedValue('exhausted');
    const req = { method: 'POST', headers: {} } as any;
    const res = {} as any;

    await handler(req, res);

    expect(generateReading).not.toHaveBeenCalled();
    expect(incrementUsage).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ ok: false, reason: 'quota_exhausted' });
  });

  it('releases an atomic reservation when content generation fails', async () => {
    vi.mocked(readRawBody).mockResolvedValue(
      Buffer.from(JSON.stringify({ usage_type: 'short_reading', category: 'bazi' })),
    );
    vi.mocked(reserveUsage).mockResolvedValue('reserved');
    vi.mocked(generateReading).mockResolvedValue(null);
    const req = { method: 'POST', headers: {} } as any;
    const res = {} as any;

    await handler(req, res);

    expect(releaseUsage).toHaveBeenCalledWith('user-1', 'short_reading', '2026-07');
    expect(incrementUsage).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({ ok: false, message: 'busy' });
  });
});
