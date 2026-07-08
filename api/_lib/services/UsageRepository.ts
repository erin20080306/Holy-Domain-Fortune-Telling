import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { getTaipeiUsageMonth } from '../../../shared/usageMonth.js';
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

export async function getOrCreateQuota(
  userId: string,
  plan: PlanId,
  month = getTaipeiUsageMonth(),
): Promise<UsageQuotaRow> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('user_usage_quotas')
    .select('*')
    .eq('user_id', userId)
    .eq('usage_month_taipei', month)
    .maybeSingle();
  if (data) return data as UsageQuotaRow;

  const { data: created, error } = await admin
    .from('user_usage_quotas')
    .insert({ user_id: userId, usage_month_taipei: month, plan })
    .select('*')
    .single();
  if (error) throw error;
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
  await admin.rpc('increment_usage_counter', {
    p_user_id: userId,
    p_month: month,
    p_column: COLUMN[usage],
  });
}
