import { readRawBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http';
import { getAuthedUser } from '../_lib/auth';
import { ensureSubscription } from '../_lib/services/SubscriptionRepository';
import { getOrCreateQuota, incrementUsage, usedCount } from '../_lib/services/UsageRepository';
import { planLimitsFromEnv } from '../_lib/env';
import { checkEntitlement } from '../../shared/entitlement';
import { USER_MESSAGES } from '../../shared/productCopy';
import type { UsageType } from '../../shared/plans';

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

  const sub = await ensureSubscription(user.userId);
  const quota = await getOrCreateQuota(user.userId, sub.plan);

  const gate = checkEntitlement({
    plan: sub.plan,
    status: sub.status,
    usage,
    used: usedCount(quota, usage),
    limits: planLimitsFromEnv(),
  });

  if (!gate.allowed) {
    const message = gate.reason === 'plan_required' ? USER_MESSAGES.planRequired : USER_MESSAGES.quotaExhausted;
    return sendJson(res, 403, { ok: false, message, remaining: 0 });
  }

  // --- Content production (placeholder). Real AI provider is server-only and
  // selected via env; its name is NEVER returned to the client. ---
  let content: string | null = null;
  try {
    content = await produceContent(usage, body);
  } catch {
    // API failure -> do NOT decrement quota.
    return sendJson(res, 200, { ok: false, message: USER_MESSAGES.analysisBusy });
  }

  if (!content) {
    return sendJson(res, 200, { ok: false, message: USER_MESSAGES.analysisBusy });
  }

  // Only now, after successful non-cached generation, do we consume quota.
  const fromCache = body.__from_cache === true;
  if (!fromCache) {
    await incrementUsage(user.userId, usage);
  }

  return sendJson(res, 200, {
    ok: true,
    content,
    remaining: Math.max(0, gate.remaining === Infinity ? 999 : gate.remaining - (fromCache ? 0 : 1)),
  });
}

// Placeholder generator. Returns null when no provider configured so the caller
// surfaces a friendly "busy" message and does not consume quota.
async function produceContent(usage: UsageType, _body: any): Promise<string | null> {
  const hasProvider = !!process.env.ANTHROPIC_API_KEY || !!process.env.GEMINI_API_KEY;
  if (!hasProvider) return null;
  // Real provider dispatch would live here (server-only). Kept abstract on purpose.
  return `（${usage} 內容產生器待接上內部服務）`;
}
