import { readRawBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getAuthedUser } from '../_lib/auth.js';
import { ensureSubscription } from '../_lib/services/SubscriptionRepository.js';
import { getOrCreateQuota, incrementUsage, usedCount } from '../_lib/services/UsageRepository.js';
import { planLimitsFromEnv } from '../_lib/env.js';
import { checkEntitlement } from '../../shared/entitlement.js';
import { USER_MESSAGES } from '../../shared/productCopy.js';
import type { UsageType } from '../../shared/plans.js';
import { generateReading } from '../_lib/ai/generateReading.js';

const ALLOWED: UsageType[] = ['short_reading', 'premium_report', 'premium_chat', 'tarot'];

// Generates fortune content. Enforcement order:
// 1) verify auth  2) check entitlement  3) produce content  4) increment usage.
// Usage is incremented ONLY on successful, non-cached generation. The client
// never learns which provider/model produced the content.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const user = await getAuthedUser(req);
  if (!user) return sendJson(res, 401, { ok: false, message: USER_MESSAGES.loginRequired });
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false });

  const raw = await readRawBody(req);
  const body = raw.length ? JSON.parse(raw.toString('utf8')) : {};
  const usage = body.usage_type as UsageType;
  if (!ALLOWED.includes(usage)) return sendJson(res, 400, { ok: false });

  // Admins have unlimited access and never require a subscription. Skip all
  // entitlement/quota enforcement for them.
  const admin = user.role === 'admin' || user.role === 'super_admin';

  let gate = { allowed: true, remaining: Infinity } as ReturnType<typeof checkEntitlement>;
  if (!admin) {
    const sub = await ensureSubscription(user.userId);
    const quota = await getOrCreateQuota(user.userId, sub.plan);

    gate = checkEntitlement({
      plan: sub.plan,
      status: sub.status,
      usage,
      used: usedCount(quota, usage),
      limits: planLimitsFromEnv(),
    });

    if (!gate.allowed) {
      const message =
        gate.reason === 'plan_required' ? USER_MESSAGES.planRequired : USER_MESSAGES.quotaExhausted;
      return sendJson(res, 403, { ok: false, message, remaining: 0 });
    }
  }

  // --- Content production. The provider is server-only and selected via env;
  // its name is NEVER returned to the client. ---
  let content: string | null = null;
  try {
    content = await generateReading(usage, body, user.userId);
  } catch {
    // API failure -> do NOT decrement quota.
    return sendJson(res, 200, { ok: false, message: USER_MESSAGES.analysisBusy });
  }

  if (!content) {
    return sendJson(res, 200, { ok: false, message: USER_MESSAGES.analysisBusy });
  }

  // Only now, after successful non-cached generation, do we consume quota.
  // Admins are unlimited, so their usage is never counted.
  const fromCache = body.__from_cache === true;
  if (!admin && !fromCache) {
    await incrementUsage(user.userId, usage);
  }

  return sendJson(res, 200, {
    ok: true,
    content,
    remaining: Math.max(0, gate.remaining === Infinity ? 999 : gate.remaining - (fromCache ? 0 : 1)),
  });
}
