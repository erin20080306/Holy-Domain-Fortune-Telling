import { readRawBody, sendJson, type ApiRequest, type ApiResponse } from '../../../_lib/http';
import { getAuthedUser, isAdmin } from '../../../_lib/auth';
import { getSupabaseAdmin } from '../../../_lib/supabaseAdmin';
import { applySubscriptionAction } from '../../../_lib/paypal/paypalSubscriptionService';
import { mapEventTypeToAction } from '../../../_lib/paypal/paypalPlanMapper';
import { writeAuditLog } from '../../../_lib/services/AdminAuditService';
import { USER_MESSAGES } from '../../../../shared/productCopy';
import type { PlanId } from '../../../../shared/plans';

// Admin manually matches an unmatched PayPal event to a user + plan. Writes an
// audit log. This is the only manual path to activate an unmatched payment.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const adminUser = await getAuthedUser(req);
  if (!isAdmin(adminUser)) return sendJson(res, 403, { ok: false, message: USER_MESSAGES.genericError });
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false });

  const eventId = (Array.isArray(req.query?.paymentEventId) ? req.query?.paymentEventId[0] : req.query?.paymentEventId) ?? '';
  const raw = await readRawBody(req);
  const body = raw.length ? JSON.parse(raw.toString('utf8')) : {};
  const targetUserId: string = body.user_id;
  const plan = body.plan as PlanId;
  if (!eventId || !targetUserId || !plan) return sendJson(res, 400, { ok: false });

  const admin = getSupabaseAdmin();
  const { data: event } = await admin
    .from('paypal_payment_events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();
  if (!event) return sendJson(res, 404, { ok: false });

  try {
    const action = mapEventTypeToAction((event as any).event_type) === 'ignore'
      ? 'activate'
      : mapEventTypeToAction((event as any).event_type);

    await applySubscriptionAction({ userId: targetUserId, plan, action });

    await admin
      .from('paypal_payment_events')
      .update({ status: 'processed', matched_user_id: targetUserId, processed_at: new Date().toISOString() })
      .eq('id', eventId);

    await writeAuditLog({
      adminUserId: adminUser.userId,
      targetUserId,
      action: 'manual_match_payment',
      before: { event_status: 'pending_match' },
      after: { plan, matched_event: eventId },
      note: typeof body.note === 'string' ? body.note : null,
    });

    return sendJson(res, 200, { ok: true });
  } catch {
    return sendJson(res, 200, { ok: false, message: USER_MESSAGES.genericError });
  }
}
