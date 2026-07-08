import { sendJson, type ApiRequest, type ApiResponse } from '../_lib/http';
import { getAuthedUser, isAdmin } from '../_lib/auth';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin';
import { USER_MESSAGES } from '../../shared/productCopy';

// Paginated admin audit log feed. Admin-only.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const user = await getAuthedUser(req);
  if (!isAdmin(user)) return sendJson(res, 403, { ok: false, message: USER_MESSAGES.genericError });

  const q = req.query ?? {};
  const page = Math.max(1, Number(Array.isArray(q.page) ? q.page[0] : q.page) || 1);
  const pageSize = 30;

  const admin = getSupabaseAdmin();
  const { data, count } = await admin
    .from('admin_audit_logs')
    .select('id, admin_user_id, target_user_id, action, note, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  return sendJson(res, 200, { ok: true, page, total: count ?? 0, logs: data ?? [] });
}
