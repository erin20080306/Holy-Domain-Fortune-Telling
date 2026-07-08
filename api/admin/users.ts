import { sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getAuthedUser, isAdmin } from '../_lib/auth.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getTaipeiUsageMonth } from '../../shared/usageMonth.js';
import { USER_MESSAGES } from '../../shared/productCopy.js';

// Paginated admin user list with search/filter. Admin-only (role checked here,
// never on the frontend). Joins profile + subscription + current-month usage.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const user = await getAuthedUser(req);
  if (!isAdmin(user)) return sendJson(res, 403, { ok: false, message: USER_MESSAGES.genericError });

  const q = req.query ?? {};
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const page = Math.max(1, Number(str(q.page)) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(str(q.pageSize)) || 20));
  const search = str(q.search).trim();
  const planFilter = str(q.plan).trim();
  const statusFilter = str(q.status).trim();
  const sort = str(q.sort) || 'created_at';

  const admin = getSupabaseAdmin();
  const month = getTaipeiUsageMonth();

  let query = admin
    .from('user_profiles')
    .select('user_id, display_name, email, phone, created_at, last_login_at, login_count, last_login_user_agent, last_login_ip', { count: 'exact' });

  if (search) {
    query = query.or(
      `email.ilike.%${search}%,display_name.ilike.%${search}%,phone.ilike.%${search}%`,
    );
  }
  query = query.order(sort === 'last_login_at' ? 'last_login_at' : 'created_at', {
    ascending: false,
    nullsFirst: false,
  });
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data: profiles, count, error } = await query;
  if (error) return sendJson(res, 200, { ok: false, message: USER_MESSAGES.genericError });

  const ids = ((profiles ?? []) as any[]).map((p) => p.user_id);
  const [{ data: subs }, { data: quotas }] = await Promise.all([
    admin.from('user_subscriptions').select('*').in('user_id', ids),
    admin
      .from('user_usage_quotas')
      .select('*')
      .in('user_id', ids)
      .eq('usage_month_taipei', month),
  ]);

  const subMap = new Map(((subs ?? []) as any[]).map((s) => [s.user_id, s] as const));
  const quotaMap = new Map(((quotas ?? []) as any[]).map((qm) => [qm.user_id, qm] as const));

  let rows = ((profiles ?? []) as any[]).map((p) => {
    const s = subMap.get(p.user_id);
    const u = quotaMap.get(p.user_id);
    return {
      user_id: p.user_id,
      created_at: p.created_at,
      display_name: p.display_name,
      email: p.email,
      phone: p.phone,
      plan: s?.plan ?? 'free',
      source: s?.source ?? 'free',
      status: s?.status ?? 'none',
      short_reading_used: u?.free_ai_count ?? 0,
      premium_report_used: u?.premium_report_count ?? 0,
      premium_chat_used: u?.premium_chat_count ?? 0,
      login_count: p.login_count ?? 0,
      last_login_at: p.last_login_at,
      last_login_user_agent: p.last_login_user_agent,
      last_login_ip: p.last_login_ip,
    };
  });

  if (planFilter) rows = rows.filter((r: any) => r.plan === planFilter);
  if (statusFilter) rows = rows.filter((r: any) => r.status === statusFilter);

  return sendJson(res, 200, {
    ok: true,
    page,
    pageSize,
    total: count ?? rows.length,
    users: rows,
  });
}
