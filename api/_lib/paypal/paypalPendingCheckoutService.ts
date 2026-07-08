import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { getPaypalConfig } from './paypalConfig.js';
import type { PlanId } from '../../../shared/plans.js';

export interface PendingCheckout {
  checkoutToken: string;
  checkoutUrl: string;
  plan: PlanId;
}

// Creates a pending subscription record BEFORE the user is sent to PayPal.
// Activation NEVER happens here - only the webhook / admin match activates.
export async function createPendingCheckout(
  userId: string,
  plan: Exclude<PlanId, 'free'>,
): Promise<PendingCheckout> {
  const cfg = getPaypalConfig();
  const planCfg = cfg.plans[plan];
  const checkoutToken = randomUUID();

  // NCP fixed links cannot carry metadata; we still record our token so an
  // admin can reconcile the payment later if the webhook cannot auto-match.
  const checkoutUrl = planCfg.link;

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('paypal_pending_checkouts').insert({
    user_id: userId,
    plan,
    checkout_token: checkoutToken,
    checkout_url: checkoutUrl,
    status: 'pending',
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  if (error) throw error;

  return { checkoutToken, checkoutUrl, plan };
}
