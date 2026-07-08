import type { PlanId } from '../../../shared/plans';

// Maps a public checkout plan key to the internal PlanId. Only known plans map.
export function mapCheckoutPlan(input: string | undefined): PlanId | null {
  switch (input) {
    case 'pro_monthly':
      return 'pro_monthly';
    case 'master_monthly':
      return 'master_monthly';
    default:
      return null;
  }
}

// Maps PayPal webhook event types to a normalized subscription action.
export type SubscriptionAction =
  | 'activate'
  | 'cancel'
  | 'suspend'
  | 'expire'
  | 'payment_failed'
  | 'refund'
  | 'ignore';

export function mapEventTypeToAction(eventType: string): SubscriptionAction {
  switch (eventType) {
    case 'PAYMENT.SALE.COMPLETED':
    case 'CHECKOUT.ORDER.APPROVED':
    case 'CHECKOUT.ORDER.COMPLETED':
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
    case 'PAYMENT.CAPTURE.COMPLETED':
      return 'activate';
    case 'BILLING.SUBSCRIPTION.CANCELLED':
      return 'cancel';
    case 'BILLING.SUBSCRIPTION.SUSPENDED':
      return 'suspend';
    case 'BILLING.SUBSCRIPTION.EXPIRED':
      return 'expire';
    case 'PAYMENT.SALE.DENIED':
    case 'PAYMENT.CAPTURE.DENIED':
      return 'payment_failed';
    case 'PAYMENT.CAPTURE.REFUNDED':
    case 'PAYMENT.SALE.REFUNDED':
      return 'refund';
    default:
      return 'ignore';
  }
}
