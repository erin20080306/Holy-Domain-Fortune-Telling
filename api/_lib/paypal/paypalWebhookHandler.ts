import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { mapEventTypeToAction } from './paypalPlanMapper.js';
import { applySubscriptionAction } from './paypalSubscriptionService.js';
import type { PlanId } from '../../../shared/plans.js';

interface WebhookResult {
  status: 'processed' | 'pending_match' | 'ignored' | 'duplicate' | 'failed';
}

interface ResolvedCheckout {
  userId: string;
  plan: PlanId;
  pendingCheckoutId?: string;
  paypalSubscriptionId?: string;
}

function payerEmail(resource: any): string | null {
  return (
    resource?.payer?.email_address ??
    resource?.payment_source?.paypal?.email_address ??
    null
  );
}

// Resolve in descending order of confidence: app checkout token, an existing
// PayPal subscription ID, then a recent pending checkout whose app email
// exactly matches the PayPal payer email.
async function resolveUser(eventType: string, payload: any): Promise<ResolvedCheckout | null> {
  const admin = getSupabaseAdmin();
  const resource = payload?.resource ?? {};

  // 1) custom_id / invoice_id may carry our checkout_token if configured.
  const token: string | undefined =
    resource.custom_id ||
    resource.custom ||
    resource.invoice_id ||
    resource.purchase_units?.[0]?.custom_id;
  if (token) {
    const { data } = await admin
      .from('paypal_pending_checkouts')
      .select('id, user_id, plan')
      .eq('checkout_token', token)
      .maybeSingle();
    if (data) {
      return {
        userId: data.user_id,
        plan: data.plan as PlanId,
        pendingCheckoutId: data.id,
        paypalSubscriptionId: eventType.startsWith('BILLING.SUBSCRIPTION.')
          ? resource.id
          : resource.billing_agreement_id ?? resource.subscription_id,
      };
    }
  }

  const subscriptionId =
    resource.billing_agreement_id ??
    resource.subscription_id ??
    (eventType.startsWith('BILLING.SUBSCRIPTION.') ? resource.id : null);
  if (subscriptionId) {
    const { data } = await admin
      .from('user_subscriptions')
      .select('user_id, plan')
      .eq('paypal_subscription_id', subscriptionId)
      .maybeSingle();
    if (data) {
      return {
        userId: data.user_id,
        plan: data.plan as PlanId,
        paypalSubscriptionId: subscriptionId,
      };
    }
  }

  const email = payerEmail(resource)?.trim().toLowerCase();
  if (email) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('user_id')
      .ilike('email', email)
      .maybeSingle();
    if (profile) {
      const { data: pending } = await admin
        .from('paypal_pending_checkouts')
        .select('id, user_id, plan')
        .eq('user_id', profile.user_id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pending) {
        return {
          userId: pending.user_id,
          plan: pending.plan as PlanId,
          pendingCheckoutId: pending.id,
          paypalSubscriptionId: eventType.startsWith('BILLING.SUBSCRIPTION.')
            ? resource.id
            : resource.billing_agreement_id ?? resource.subscription_id,
        };
      }
    }
  }

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

  // Missing webhook credentials means the event cannot be trusted. Keep it
  // visible for explicit admin reconciliation, but never auto-activate access.
  if (params.verificationStatus === 'skipped') {
    await admin.from('paypal_payment_events').insert({
      paypal_event_id: params.eventId,
      event_type: params.eventType,
      raw_payload_json: params.payload,
      verification_status: 'skipped',
      status: 'pending_match',
    });
    return { status: 'pending_match' };
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

  const match = await resolveUser(params.eventType, params.payload);
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
    payerEmail: payerEmail(resource),
    paypalSubscriptionId: match.paypalSubscriptionId ?? null,
    paypalTransactionId: resource?.id ?? null,
  });

  if (match.pendingCheckoutId) {
    await admin
      .from('paypal_pending_checkouts')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', match.pendingCheckoutId);
  }

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
