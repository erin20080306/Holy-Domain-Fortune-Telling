import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { isMissingSupabaseSchemaError } from '../supabaseErrors.js';
import { getTaipeiDayKey, getTaipeiUsageMonth } from '../../../shared/usageMonth.js';
import type { PlanId, UsageType } from '../../../shared/plans.js';

export interface UsageQuotaRow {
  user_id: string;
  usage_month_taipei: string;
  plan: PlanId;
  free_ai_count: number;
  premium_report_count: number;
  premium_chat_count: number;
  tarot_draw_count: number;
  bazi_count: number;
  ziwei_count: number;
}

const COLUMN: Record<UsageType, keyof UsageQuotaRow> = {
  short_reading: 'free_ai_count',
  premium_report: 'premium_report_count',
  premium_chat: 'premium_chat_count',
  tarot: 'tarot_draw_count',
  bazi: 'bazi_count',
  ziwei: 'ziwei_count',
};

// Most usage resets monthly. Tarot is promised as a daily draw, so it uses the
// Taipei day key while still sharing the existing quota table.
export function getUsageBucketKey(usage: UsageType, date = new Date()): string {
  return usage === 'tarot' ? getTaipeiDayKey(date) : getTaipeiUsageMonth(date);
}

function emptyQuota(userId: string, plan: PlanId, month: string): UsageQuotaRow {
  return {
    user_id: userId,
    usage_month_taipei: month,
    plan,
    free_ai_count: 0,
    premium_report_count: 0,
    premium_chat_count: 0,
    tarot_draw_count: 0,
    bazi_count: 0,
    ziwei_count: 0,
  };
}

export async function getOrCreateQuota(
  userId: string,
  plan: PlanId,
  month = getTaipeiUsageMonth(),
): Promise<UsageQuotaRow> {
  const admin = getSupabaseAdmin();
  const { data, error: lookupError } = await admin
    .from('user_usage_quotas')
    .select('*')
    .eq('user_id', userId)
    .eq('usage_month_taipei', month)
    .maybeSingle();
  if (lookupError) {
    if (isMissingSupabaseSchemaError(lookupError)) return emptyQuota(userId, plan, month);
    throw lookupError;
  }
  if (data) return data as UsageQuotaRow;

  const { data: created, error } = await admin
    .from('user_usage_quotas')
    .insert({ user_id: userId, usage_month_taipei: month, plan })
    .select('*')
    .single();
  if (error) {
    if (isMissingSupabaseSchemaError(error)) return emptyQuota(userId, plan, month);
    throw error;
  }
  return created as UsageQuotaRow;
}

export function usedCount(row: UsageQuotaRow, usage: UsageType): number {
  return (row[COLUMN[usage]] as number) ?? 0;
}

// Atomically increments a usage counter. Called ONLY after content is
// successfully produced (never on cache hit or API failure).
export async function incrementUsage(
  userId: string,
  usage: UsageType,
  month = getTaipeiUsageMonth(),
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.rpc('increment_usage_counter', {
    p_user_id: userId,
    p_month: month,
    p_column: COLUMN[usage],
  });
  if (error && !isMissingSupabaseSchemaError(error)) throw error;
}
