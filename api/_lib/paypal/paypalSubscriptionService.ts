import { updateSubscription, ensureSubscription } from '../services/SubscriptionRepository';
import type { PlanId } from '../../../shared/plans';
import type { SubscriptionAction } from './paypalPlanMapper';

// Applies a webhook-derived action to a user's subscription. This is the ONLY
// place a PayPal event mutates a plan, and only after signature verification.
export async function applySubscriptionAction(params: {
  userId: string;
  plan: PlanId;
  action: SubscriptionAction;
  payerEmail?: string | null;
  paypalSubscriptionId?: string | null;
  paypalTransactionId?: string | null;
}): Promise<void> {
  await ensureSubscription(params.userId);
  const now = new Date().toISOString();

  switch (params.action) {
    case 'activate': {
      const periodEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
      await updateSubscription(params.userId, {
        plan: params.plan,
        status: 'active',
        source: 'paypal',
        paypal_payer_email: params.payerEmail ?? null,
        paypal_subscription_id: params.paypalSubscriptionId ?? null,
        paypal_transaction_id: params.paypalTransactionId ?? null,
        current_period_start: now,
        current_period_end: periodEnd,
        activated_at: now,
      });
      break;
    }
    case 'cancel':
      await updateSubscription(params.userId, { status: 'cancelled', cancelled_at: now });
      break;
    case 'suspend':
      await updateSubscription(params.userId, { status: 'suspended' });
      break;
    case 'expire':
      await updateSubscription(params.userId, { status: 'expired', plan: 'free' });
      break;
    case 'refund':
    case 'payment_failed':
      await updateSubscription(params.userId, { status: 'cancelled', plan: 'free' });
      break;
    case 'ignore':
    default:
      break;
  }
}
