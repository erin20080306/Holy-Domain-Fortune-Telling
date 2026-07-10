import { sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getAuthedUser } from '../_lib/auth.js';
import { ensureSubscription } from '../_lib/services/SubscriptionRepository.js';
import { getOrCreateQuota, getUsageBucketKey } from '../_lib/services/UsageRepository.js';
import { planLimitsFromEnv } from '../_lib/env.js';
import { effectivePlan } from '../../shared/entitlement.js';
import { USER_MESSAGES } from '../../shared/productCopy.js';

// Returns the caller's current-month usage + remaining allowances.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const user = await getAuthedUser(req);
  if (!user) return sendJson(res, 401, { ok: false, message: USER_MESSAGES.loginRequired });

  try {
    const sub = await ensureSubscription(user.userId);
    const plan = effectivePlan(sub.plan, sub.status, sub.current_period_end);
    const [quota, tarotQuota] = await Promise.all([
      getOrCreateQuota(user.userId, plan, getUsageBucketKey('short_reading', new Date(), plan)),
      getOrCreateQuota(user.userId, plan, getUsageBucketKey('tarot', new Date(), plan)),
    ]);
    const limits = planLimitsFromEnv()[plan];

    return sendJson(res, 200, {
      ok: true,
      plan,
      usage: {
        short_reading: { used: quota.free_ai_count, limit: limits.shortAiPerMonth },
        premium_report: { used: quota.premium_report_count, limit: limits.premiumReportPerMonth },
        premium_chat: { used: quota.premium_chat_count, limit: limits.premiumChatPerMonth },
        tarot: { used: tarotQuota.tarot_draw_count, limit: limits.tarotPerPeriod },
      },
    });
  } catch {
    return sendJson(res, 200, { ok: false, message: USER_MESSAGES.genericError });
  }
}
