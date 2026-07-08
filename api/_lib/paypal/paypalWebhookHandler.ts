import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { mapEventTypeToAction } from './paypalPlanMapper.js';
import { applySubscriptionAction } from './paypalSubscriptionService.js';
import type { PlanId } from '../../../shared/plans.js';

interface WebhookResult {
  status: 'processed' | 'pending_match' | 'ignored' | 'duplicate' | 'failed';
}

// Attempts to resolve which user a PayPal event belongs to. NCP fixed links do
// not reliably carry our token, so matching may fail -> pending_match.
async function resolveUser(payload: any): Promise<{ userId: string; plan: PlanId } | null> {
  const admin = getSupabaseAdmin();
  const resource = payload?.resource ?? {};

  // 1) custom_id / invoice_id may carry our checkout_token if configured.
  const token: string | undefined =
    resource.custom_id || resource.custom || resource.invoice_id;
  if (token) {
    const { data } = await admin
      .from('paypal_pending_checkouts')
      .select('user_id, plan')
      .eq('checkout_token', token)
      .maybeSingle();
    if (data) return { userId: data.user_id, plan: data.plan as PlanId };
  }

  // Intentionally NOT matching by payer email alone: the PayPal email may
  // differ from the app account email. Unmatched -> admin manual match.
  return null;
}

// Processes a verified webhook event with idempotency on paypal_event_id.
export async function handleWebhookEvent(params: {
  eventId: string;
  eventType: string;
  payload: any;
  verificationStatus: 'verified' | 'failed' | 'skipped';
}): Promise<WebhookResult> {
  const admin = getSupabaseAdmin();

  // Idempotency: if we've already stored this event, do nothing.
  const { data: existing } = await admin
    .from('paypal_payment_events')
    .select('id, status')
    .eq('paypal_event_id', params.eventId)
    .maybeSingle();
  if (existing) return { status: 'duplicate' };

  // Never mutate plans on failed verification.
  if (params.verificationStatus === 'failed') {
    await admin.from('paypal_payment_events').insert({
      paypal_event_id: params.eventId,
      event_type: params.eventType,
      raw_payload_json: params.payload,
      verification_status: 'failed',
      status: 'failed',
      processed_at: new Date().toISOString(),
    });
    return { status: 'failed' };
  }

  const action = mapEventTypeToAction(params.eventType);
  if (action === 'ignore') {
    await admin.from('paypal_payment_events').insert({
      paypal_event_id: params.eventId,
      event_type: params.eventType,
      raw_payload_json: params.payload,
      verification_status: params.verificationStatus,
      status: 'ignored',
      processed_at: new Date().toISOString(),
    });
    return { status: 'ignored' };
  }

  const match = await resolveUser(params.payload);
  if (!match) {
    await admin.from('paypal_payment_events').insert({
      paypal_event_id: params.eventId,
      event_type: params.eventType,
      raw_payload_json: params.payload,
      verification_status: params.verificationStatus,
      status: 'pending_match',
    });
    return { status: 'pending_match' };
  }

  const resource = params.payload?.resource ?? {};
  await applySubscriptionAction({
    userId: match.userId,
    plan: match.plan,
    action,
    payerEmail: resource?.payer?.email_address ?? null,
    paypalSubscriptionId: resource?.id ?? null,
    paypalTransactionId: resource?.id ?? null,
  });

  await admin.from('paypal_payment_events').insert({
    paypal_event_id: params.eventId,
    event_type: params.eventType,
    raw_payload_json: params.payload,
    verification_status: params.verificationStatus,
    matched_user_id: match.userId,
    status: 'processed',
    processed_at: new Date().toISOString(),
  });
  return { status: 'processed' };
}
