import { getSupabaseAdmin } from '../supabaseAdmin';
import type { PlanId, SubscriptionSource, SubscriptionStatus } from '../../../shared/plans';

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  paypal_payer_email: string | null;
  paypal_subscription_id: string | null;
  paypal_transaction_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  activated_at: string | null;
  cancelled_at: string | null;
  admin_note: string | null;
  updated_at: string;
}

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as SubscriptionRow) ?? null;
}

export async function ensureSubscription(userId: string): Promise<SubscriptionRow> {
  const existing = await getSubscription(userId);
  if (existing) return existing;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('user_subscriptions')
    .insert({ user_id: userId, plan: 'free', status: 'none', source: 'free' })
    .select('*')
    .single();
  if (error) throw error;
  return data as SubscriptionRow;
}

export async function updateSubscription(
  userId: string,
  patch: Partial<Omit<SubscriptionRow, 'id' | 'user_id'>> & {
    updated_by_admin_id?: string | null;
  },
): Promise<SubscriptionRow> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('user_subscriptions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as SubscriptionRow;
}
