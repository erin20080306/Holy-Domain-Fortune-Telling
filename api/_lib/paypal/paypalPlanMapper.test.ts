import { describe, expect, it } from 'vitest';
import { mapEventTypeToAction } from './paypalPlanMapper';

describe('PayPal webhook event mapping', () => {
  it('only activates access after a completed payment or active subscription', () => {
    expect(mapEventTypeToAction('CHECKOUT.ORDER.APPROVED')).toBe('ignore');
    expect(mapEventTypeToAction('PAYMENT.CAPTURE.COMPLETED')).toBe('activate');
    expect(mapEventTypeToAction('BILLING.SUBSCRIPTION.ACTIVATED')).toBe('activate');
  });
});
