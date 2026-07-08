import { sendJson, type ApiRequest, type ApiResponse } from '../_lib/http';
import { getAuthedUser, isAdmin, isSuperAdmin } from '../_lib/auth';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin';
import { serverEnv } from '../_lib/env';
import { getTaipeiDayKey, getTaipeiUsageMonth } from '../../shared/usageMonth';
import { USER_MESSAGES } from '../../shared/productCopy';

// Dashboard KPIs. Provider/model names are NEVER included unless
// ADMIN_DEBUG_AI_PROVIDER_VISIBLE=true AND caller is super_admin.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const user = await getAuthedUser(req);
  if (!isAdmin(user)) return sendJson(res, 403, { ok: false, message: USER_MESSAGES.genericError });

  const admin = getSupabaseAdmin();
  const month = getTaipeiUsageMonth();
  const today = getTaipeiDayKey();
  const todayStartUtc = new Date(`${today}T00:00:00+08:00`).toISOString();

  const [total, subs, quotas, pending, todayNew, todayLogins] = await Promise.all([
    admin.from('user_profiles').select('user_id', { count: 'exact', head: true }),
    admin.from('user_subscriptions').select('plan, status'),
    admin.from('user_usage_quotas').select('free_ai_count, premium_report_count').eq('usage_month_taipei', month),
    admin.from('paypal_payment_events').select('id', { count: 'exact', head: true }).eq('status', 'pending_match'),
    admin.from('user_profiles').select('user_id', { count: 'exact', head: true }).gte('created_at', todayStartUtc),
    admin.from('user_profiles').select('user_id', { count: 'exact', head: true }).gte('last_login_at', todayStartUtc),
  ]);

  const subRows = (subs.data ?? []) as any[];
  const active = subRows.filter((s) => ['active', 'manual_active'].includes(s.status));
  const planCount = (p: string) => active.filter((s) => s.plan === p).length;

  const quotaRows = (quotas.data ?? []) as any[];
  const shortUsed = quotaRows.reduce((a, q) => a + (q.free_ai_count ?? 0), 0);
  const reportUsed = quotaRows.reduce((a, q) => a + (q.premium_report_count ?? 0), 0);

  // Rough cost estimate from internal logs (internal only).
  const { data: costRows } = await admin.from('ai_usage_logs').select('estimated_cost_usd');
  const estCost = ((costRows ?? []) as any[]).reduce((a, r) => a + Number(r.estimated_cost_usd ?? 0), 0);

  let totalLogins: number | null = null;
  try {
    const { data: loginSum } = await admin.rpc('total_login_count');
    totalLogins = typeof loginSum === 'number' ? loginSum : null;
  } catch {
    totalLogins = null;
  }

  const payload: Record<string, unknown> = {
    ok: true,
    total_users: total.count ?? 0,
    today_new_users: todayNew.count ?? 0,
    today_logins: todayLogins.count ?? 0,
    total_logins: totalLogins,
    subscribed_users: active.length,
    plan_counts: {
      free: (total.count ?? 0) - active.length,
      pro_monthly: planCount('pro_monthly'),
      master_monthly: planCount('master_monthly'),
    },
    pending_paypal_match: pending.count ?? 0,
    short_reading_used: shortUsed,
    premium_report_used: reportUsed,
    estimated_cost_usd: Number(estCost.toFixed(2)),
  };

  // Internal provider visibility gate.
  payload.provider_debug_visible =
    serverEnv.adminDebugProviderVisible && isSuperAdmin(user);

  return sendJson(res, 200, payload);
}
