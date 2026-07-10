import { beforeEach, describe, expect, it, vi } from 'vitest';

const deleteUser = vi.fn();

vi.mock('../_lib/http.js', () => ({
  readRawBody: vi.fn(),
  sendJson: vi.fn((res: any, code: number, body: unknown) => {
    res.statusCode = code;
    res.body = body;
  }),
}));
vi.mock('../_lib/auth.js', () => ({ getAuthedUser: vi.fn() }));
vi.mock('../_lib/supabaseAdmin.js', () => ({
  getSupabaseAdmin: vi.fn(() => ({ auth: { admin: { deleteUser } } })),
}));
vi.mock('../_lib/services/SubscriptionRepository.js', () => ({ getSubscription: vi.fn() }));
vi.mock('../../shared/productCopy.js', () => ({
  USER_MESSAGES: { loginRequired: 'login required', genericError: 'error' },
}));

import handler from './delete-account';
import { getAuthedUser } from '../_lib/auth';
import { readRawBody } from '../_lib/http';
import { getSubscription } from '../_lib/services/SubscriptionRepository';

describe('account deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthedUser).mockResolvedValue({
      userId: 'user-1',
      email: 'member@example.com',
      role: 'user',
    });
    vi.mocked(readRawBody).mockResolvedValue(Buffer.from(JSON.stringify({ confirm: 'DELETE' })));
    deleteUser.mockResolvedValue({ error: null });
  });

  it('blocks deletion while a PayPal subscription is active', async () => {
    vi.mocked(getSubscription).mockResolvedValue({
      source: 'paypal',
      status: 'active',
    } as any);
    const res = {} as any;

    await handler({ method: 'DELETE', headers: {} } as any, res);

    expect(deleteUser).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ ok: false, reason: 'active_payment' });
  });

  it('deletes a confirmed account without an active PayPal subscription', async () => {
    vi.mocked(getSubscription).mockResolvedValue({
      source: 'paypal',
      status: 'cancelled',
    } as any);
    const res = {} as any;

    await handler({ method: 'DELETE', headers: {} } as any, res);

    expect(deleteUser).toHaveBeenCalledWith('user-1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
