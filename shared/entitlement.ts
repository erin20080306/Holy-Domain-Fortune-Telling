import {
  DEFAULT_PLAN_LIMITS,
  type PlanId,
  type PlanLimits,
  type SubscriptionStatus,
  type UsageType,
} from './plans';

export interface UsageCounts {
  short_reading: number;
  premium_report: number;
  premium_chat: number;
  tarot: number;
  bazi: number;
  ziwei: number;
}

export interface EntitlementResult {
  allowed: boolean;
  reason?: 'plan_required' | 'quota_exhausted';
  limit: number;
  used: number;
  remaining: number;
}

// An active plan is one of these statuses. Everything else = free tier only.
export function effectivePlan(
  plan: PlanId,
  status: SubscriptionStatus,
): PlanId {
  const activeStatuses: SubscriptionStatus[] = ['active', 'manual_active'];
  if (plan !== 'free' && activeStatuses.includes(status)) return plan;
  return 'free';
}

function limitForUsage(limits: PlanLimits, usage: UsageType): number {
  switch (usage) {
    case 'short_reading':
      return limits.shortAiPerMonth;
    case 'premium_report':
      return limits.premiumReportPerMonth;
    case 'premium_chat':
      return limits.premiumChatPerMonth;
    case 'tarot':
      return limits.tarotPerDay;
    case 'bazi':
    case 'ziwei':
      // Bazi/ziwei chart drawing is unlimited for all tiers (no AI cost).
      return Number.POSITIVE_INFINITY;
    default:
      return 0;
  }
}

// Pure entitlement check. The backend is the ONLY caller that enforces this.
export function checkEntitlement(params: {
  plan: PlanId;
  status: SubscriptionStatus;
  usage: UsageType;
  used: number;
  limits?: Record<PlanId, PlanLimits>;
}): EntitlementResult {
  const table = params.limits ?? DEFAULT_PLAN_LIMITS;
  const plan = effectivePlan(params.plan, params.status);
  const limit = limitForUsage(table[plan], params.usage);
  const used = Math.max(0, params.used);
  const remaining = limit === Number.POSITIVE_INFINITY ? Infinity : limit - used;

  if (limit <= 0) {
    return { allowed: false, reason: 'plan_required', limit, used, remaining: 0 };
  }
  if (remaining <= 0) {
    return { allowed: false, reason: 'quota_exhausted', limit, used, remaining: 0 };
  }
  return { allowed: true, limit, used, remaining };
}
