import { readRawBody, sendJson, getHeader, type ApiRequest, type ApiResponse } from '../_lib/http';
import { getAuthedUser } from '../_lib/auth';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin';
import { ensureSubscription } from '../_lib/services/SubscriptionRepository';
import { getOrCreateQuota } from '../_lib/services/UsageRepository';
import { USER_MESSAGES } from '../../shared/productCopy';

// Called right after login/registration. Ensures profile + subscription + this
// month's quota row exist, and records the login (count, time, ip, user agent).
// Because everything is keyed by user_id, no per-device state is ever created.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const user = await getAuthedUser(req);
  if (!user) return sendJson(res, 401, { ok: false, message: USER_MESSAGES.loginRequired });
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false });

  const raw = await readRawBody(req);
  const body = raw.length ? JSON.parse(raw.toString('utf8')) : {};

  const admin = getSupabaseAdmin();
  const ip =
    (getHeader(req, 'x-forwarded-for') || '').split(',')[0].trim() || null;
  const ua = getHeader(req, 'user-agent') ?? null;

  try {
    // Upsert profile (idempotent - one row per user).
    await admin
      .from('user_profiles')
      .upsert(
        {
          user_id: user.userId,
          email: user.email,
          display_name: typeof body.display_name === 'string' ? body.display_name : undefined,
          phone: typeof body.phone === 'string' ? body.phone : undefined,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    const sub = await ensureSubscription(user.userId);
    await getOrCreateQuota(user.userId, sub.plan);

    // Record login atomically via RPC.
    await admin.rpc('record_login', {
      p_user_id: user.userId,
      p_ip: ip,
      p_user_agent: ua,
    });

    return sendJson(res, 200, { ok: true });
  } catch {
    return sendJson(res, 200, { ok: false, message: USER_MESSAGES.genericError });
  }
}
