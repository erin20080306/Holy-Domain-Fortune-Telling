import { sendJson, type ApiRequest, type ApiResponse } from '../../_lib/http';
import { getAuthedUser, isAdmin } from '../../_lib/auth';
import { getSupabaseAdmin } from '../../_lib/supabaseAdmin';
import { USER_MESSAGES } from '../../../shared/productCopy';

// Lists PayPal events awaiting manual reconciliation (could not auto-match user).
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const user = await getAuthedUser(req);
  if (!isAdmin(user)) return sendJson(res, 403, { ok: false, message: USER_MESSAGES.genericError });

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('paypal_payment_events')
    .select('id, paypal_event_id, event_type, verification_status, created_at, raw_payload_json')
    .eq('status', 'pending_match')
    .order('created_at', { ascending: false })
    .limit(100);

  const events = ((data ?? []) as any[]).map((e) => ({
    id: e.id,
    event_type: e.event_type,
    verification_status: e.verification_status,
    created_at: e.created_at,
    payer_email: e.raw_payload_json?.resource?.payer?.email_address ?? null,
    amount: e.raw_payload_json?.resource?.amount?.value ?? null,
  }));

  return sendJson(res, 200, { ok: true, events });
}
