// Decides whether external PayPal payment links may be shown, based on the
// runtime platform and env flags. Pure + testable. The backend never trusts
// the client for entitlement; this only controls UI visibility.

export type Platform = 'web' | 'pwa' | 'ios_app' | 'android_app';

export interface PaypalVisibilityFlags {
  paypalCheckoutEnabled: boolean; // PAYPAL_CHECKOUT_ENABLED
  webEnablePaypalLinks: boolean; // WEB_ENABLE_PAYPAL_LINKS
  iosHideExternalPaypal: boolean; // IOS_HIDE_EXTERNAL_PAYPAL_LINKS
  androidHideExternalPaypal: boolean; // ANDROID_HIDE_EXTERNAL_PAYPAL_LINKS
}

export function shouldShowPaypalLinks(
  platform: Platform,
  flags: PaypalVisibilityFlags,
): boolean {
  // App Store / Play builds: hidden by default (Apple/Google external payment rules).
  if (platform === 'ios_app') return !flags.iosHideExternalPaypal && flags.paypalCheckoutEnabled;
  if (platform === 'android_app')
    return !flags.androidHideExternalPaypal && flags.paypalCheckoutEnabled;

  // Web + iOS Safari "Add to Home Screen" PWA are treated as web.
  return flags.webEnablePaypalLinks && flags.paypalCheckoutEnabled;
}
