import { describe, it, expect } from 'vitest';
import { shouldShowPaypalLinks } from './paypalVisibility';

const base = {
  paypalCheckoutEnabled: true,
  webEnablePaypalLinks: true,
  iosHideExternalPaypal: true,
  androidHideExternalPaypal: true,
};

describe('shouldShowPaypalLinks', () => {
  it('web + pwa show PayPal when web links enabled and checkout enabled', () => {
    expect(shouldShowPaypalLinks('web', base)).toBe(true);
    expect(shouldShowPaypalLinks('pwa', base)).toBe(true);
  });

  it('web hidden when checkout disabled', () => {
    expect(shouldShowPaypalLinks('web', { ...base, paypalCheckoutEnabled: false })).toBe(false);
  });

  it('iOS App Store build hides external PayPal by default', () => {
    expect(shouldShowPaypalLinks('ios_app', base)).toBe(false);
  });

  it('Android Play build hides external PayPal by default', () => {
    expect(shouldShowPaypalLinks('android_app', base)).toBe(false);
  });

  it('web can be turned off via WEB_ENABLE_PAYPAL_LINKS=false', () => {
    expect(shouldShowPaypalLinks('web', { ...base, webEnablePaypalLinks: false })).toBe(false);
  });
});
