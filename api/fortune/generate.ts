import { readRawBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getAuthedUser } from '../_lib/auth.js';
import { ensureSubscription } from '../_lib/services/SubscriptionRepository.js';
import {
  getOrCreateQuota,
  getUsageBucketKey,
  incrementUsage,
  releaseUsage,
  reserveUsage,
  usedCount,
} from '../_lib/services/UsageRepository.js';
import { planLimitsFromEnv } from '../_lib/env.js';
import { checkEntitlement, effectivePlan } from '../../shared/entitlement.js';
import { USER_MESSAGES } from '../../shared/productCopy.js';
import type { PlanId, UsageType } from '../../shared/plans.js';
import { generateReading } from '../_lib/ai/generateReading.js';
import { saveDeepReport } from '../_lib/services/ReadingHistoryRepository.js';

const ALLOWED: UsageType[] = ['short_reading', 'premium_report', 'premium_chat', 'tarot'];

// Supabase/Postgrest errors are plain objects (not Error instances), so
// String(err) yields "[object Object]". Serialize the useful fields instead.
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    const parts = ['message', 'code', 'details', 'hint']
      .map((k) => (e[k] ? `${k}=${e[k]}` : ''))
      .filter(Boolean);
    if (parts.length) return parts.join(' | ');
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

// Generates fortune content. Enforcement order:
// 1) verify auth  2) check entitlement  3) produce content  4) increment usage.
// Usage is incremented after every successful generation. Cache decisions are
// server-owned; no client payload can opt out of quota consumption.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const user = await getAuthedUser(req);
  if (!user) return sendJson(res, 401, { ok: false, message: USER_MESSAGES.loginRequired });
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false });

  const raw = await readRawBody(req);
  const body = raw.length ? JSON.parse(raw.toString('utf8')) : {};
  const usage = body.usage_type as UsageType;
  if (!ALLOWED.includes(usage)) return sendJson(res, 400, { ok: false });
  let usageBucket = getUsageBucketKey(usage);
  let effectiveUserPlan: PlanId = 'free';

  // Admins have unlimited access and never require a subscription. Skip all
  // entitlement/quota enforcement for them.
  const admin = user.role === 'admin' || user.role === 'super_admin';

  let gate = { allowed: true, remaining: Infinity } as ReturnType<typeof checkEntitlement>;
  if (!admin) {
    try {
      const sub = await ensureSubscription(user.userId);
      effectiveUserPlan = effectivePlan(sub.plan, sub.status, sub.current_period_end);
      usageBucket = getUsageBucketKey(usage, new Date(), effectiveUserPlan);
      const quota = await getOrCreateQuota(user.userId, effectiveUserPlan, usageBucket);

      gate = checkEntitlement({
        plan: sub.plan,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
        usage,
        used: usedCount(quota, usage),
        limits: planLimitsFromEnv(),
      });
    } catch (err) {
      // Subscription/quota lookup failed (e.g. transient DB error, or the
      // backend is not using a real service_role key so RLS blocks inserts).
      // Always return JSON so the client can recover instead of hanging.
      const detail = describeError(err);
      console.error('[fortune/generate] subscription/quota lookup failed', {
        userId: user.userId,
        usage,
        error: detail,
      });
      return sendJson(res, 200, {
        ok: false,
        message: USER_MESSAGES.analysisBusy,
        debug: `quota_lookup_failed: ${detail}`,
      });
    }

    if (!gate.allowed) {
      const message =
        gate.reason === 'plan_required' ? USER_MESSAGES.planRequired : USER_MESSAGES.quotaExhausted;
      return sendJson(res, 403, {
        ok: false,
        message,
        reason: gate.reason,
        limit: gate.limit,
        used: gate.used,
        remaining: 0,
      });
    }
  }

  let reservation: 'not_needed' | 'reserved' | 'unavailable' = admin
    ? 'not_needed'
    : 'unavailable';
  if (!admin) {
    try {
      const result = await reserveUsage(
        user.userId,
        effectiveUserPlan,
        usage,
        gate.limit,
        usageBucket,
      );
      if (result === 'exhausted') {
        return sendJson(res, 403, {
          ok: false,
          message: USER_MESSAGES.quotaExhausted,
          reason: 'quota_exhausted',
          limit: gate.limit,
          used: gate.limit,
          remaining: 0,
        });
      }
      reservation = result;
    } catch (err) {
      console.error('[fortune/generate] quota reservation failed', {
        userId: user.userId,
        usage,
        error: describeError(err),
      });
      return sendJson(res, 200, { ok: false, message: USER_MESSAGES.analysisBusy });
    }
  }

  const releaseReservation = async () => {
    if (reservation !== 'reserved') return;
    try {
      await releaseUsage(user.userId, usage, usageBucket);
    } catch (err) {
      console.error('[fortune/generate] quota release failed', {
        userId: user.userId,
        usage,
        error: describeError(err),
      });
    }
  };

  // --- Content production. The provider is server-only and selected via env;
  // its name is NEVER returned to the client. ---
  let content: string | null = null;
  try {
    content = await generateReading(usage, body, user.userId);
  } catch (err) {
    await releaseReservation();
    // API failure -> do NOT decrement quota.
    const detail = describeError(err);
    return sendJson(res, 200, {
      ok: false,
      message: USER_MESSAGES.analysisBusy,
      debug: `generate_threw: ${detail}`,
    });
  }

  if (!content) {
    await releaseReservation();
    return sendJson(res, 200, {
      ok: false,
      message: USER_MESSAGES.analysisBusy,
      debug: 'generate_returned_empty (no provider key or provider error)',
    });
  }

  let readingId: string | null = null;
  if (usage === 'premium_report') {
    try {
      readingId = await saveDeepReport({ userId: user.userId, body, content });
    } catch (err) {
      // A history write must never hide an already-generated paid report.
      console.error('[fortune/generate] saveDeepReport failed', {
        userId: user.userId,
        error: describeError(err),
      });
    }
  }

  // Only now, after successful generation, do we consume quota. Admins are
  // unlimited, so their usage is never counted.
  if (!admin && reservation !== 'reserved') {
    try {
      await incrementUsage(user.userId, usage, usageBucket);
    } catch (err) {
      // Usage increment failed (e.g. RLS blocking the RPC). Don't fail the
      // request since content was already produced; just log it.
      console.error('[fortune/generate] incrementUsage failed', {
        userId: user.userId,
        usage,
        error: describeError(err),
      });
    }
  }

  return sendJson(res, 200, {
    ok: true,
    content,
    reading_id: readingId,
    remaining: Math.max(0, gate.remaining === Infinity ? 999 : gate.remaining - 1),
  });
}
