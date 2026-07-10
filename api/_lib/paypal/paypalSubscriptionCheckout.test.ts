import { describe, expect, it } from 'vitest';
import { findPaypalApprovalUrl, isPaypalBillingPlanId } from './paypalSubscriptionCheckout';

describe('PayPal subscription checkout helpers', () => {
  it('only accepts real PayPal billing plan IDs', () => {
    expect(isPaypalBillingPlanId('P-1ABCDEF234567890')).toBe(true);
    expect(isPaypalBillingPlanId('pro_monthly')).toBe(false);
    expect(isPaypalBillingPlanId('')).toBe(false);
  });

  it('selects the approval URL from PayPal links', () => {
    expect(
      findPaypalApprovalUrl([
        { rel: 'self', href: 'https://api-m.paypal.com/subscription/1' },
        { rel: 'approve', href: 'https://www.paypal.com/webapps/billing/subscriptions/1' },
      ]),
    ).toBe('https://www.paypal.com/webapps/billing/subscriptions/1');
    expect(findPaypalApprovalUrl([{ rel: 'self', href: 'https://example.com' }])).toBeNull();
  });
});

