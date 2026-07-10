import { readRawBody, sendJson, type ApiRequest, type ApiResponse } from '../../../_lib/http.js';
import { getAuthedUser, isAdmin } from '../../../_lib/auth.js';
import { getSubscription, updateSubscription } from '../../../_lib/services/SubscriptionRepository.js';
import { writeAuditLog } from '../../../_lib/services/AdminAuditService.js';
import { getSupabaseAdmin } from '../../../_lib/supabaseAdmin.js';
import { getTaipeiUsageMonth } from '../../../../shared/usageMonth.js';
import { USER_MESSAGES } from '../../../../shared/productCopy.js';
import type { PlanId, SubscriptionStatus } from '../../../../shared/plans.js';

const VALID_PLANS: PlanId[] = ['free', 'pro_monthly', 'master_monthly'];
const VALID_STATUS: SubscriptionStatus[] = [
  'none', 'pending', 'active', 'cancelled', 'expired', 'suspended', 'manual_active',
];

// Admin edits a user's subscription. Role verified server-side. Every change is
// written to admin_audit_logs. Monthly usage is NOT reset unless explicitly asked.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const admin = await getAuthedUser(req);
  if (!isAdmin(admin)) return sendJson(res, 403, { ok: false, message: USER_MESSAGES.genericError });
  if (req.method !== 'PATCH') return sendJson(res, 405, { ok: false });

  const targetUserId = (Array.isArray(req.query?.userId) ? req.query?.userId[0] : req.query?.userId) ?? '';
  if (!targetUserId) return sendJson(res, 400, { ok: false });

  const raw = await readRawBody(req);
  const body = raw.length ? JSON.parse(raw.toString('utf8')) : {};

  const patch: Record<string, unknown> = {};
  if (body.plan) {
    if (!VALID_PLANS.includes(body.plan)) return sendJson(res, 400, { ok: false });
    patch.plan = body.plan;
    // Admin manual plan grant marks source + manual_active unless status given.
    if (body.plan !== 'free') {
      patch.source = 'admin_manual';
      if (!body.status) patch.status = 'manual_active';
    } else {
      patch.source = 'free';
      patch.status = body.status ?? 'none';
      patch.paypal_subscription_id = null;
      patch.current_period_end = null;
    }
  }
  if (body.status) {
    if (!VALID_STATUS.includes(body.status)) return sendJson(res, 400, { ok: false });
    patch.status = body.status;
  }
  if ('current_period_end' in body) {
    if (body.current_period_end === null || body.current_period_end === '') {
      patch.current_period_end = null;
    } else if (
      typeof body.current_period_end === 'string' &&
      Number.isFinite(Date.parse(body.current_period_end))
    ) {
      patch.current_period_end = body.current_period_end;
    } else {
      return sendJson(res, 400, { ok: false });
    }
  }
  if (typeof body.admin_note === 'string') patch.admin_note = body.admin_note;

  const before = await getSubscription(targetUserId);

  try {
    const after = await updateSubscription(targetUserId, {
      ...patch,
      updated_by_admin_id: admin.userId,
    });

    // Optional monthly quota reset - only when explicitly requested.
    if (body.reset_month_usage === true) {
      const sb = getSupabaseAdmin();
      await sb
        .from('user_usage_quotas')
        .update({
          free_ai_count: 0,
          premium_report_count: 0,
          premium_chat_count: 0,
          tarot_draw_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', targetUserId)
        .eq('usage_month_taipei', getTaipeiUsageMonth());
    }

    await writeAuditLog({
      adminUserId: admin.userId,
      targetUserId,
      action: body.reset_month_usage ? 'update_subscription+reset_usage' : 'update_subscription',
      before,
      after,
      note: typeof body.admin_note === 'string' ? body.admin_note : null,
    });

    return sendJson(res, 200, { ok: true });
  } catch {
    return sendJson(res, 200, { ok: false, message: USER_MESSAGES.genericError });
  }
}
