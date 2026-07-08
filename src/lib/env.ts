// Client env. ONLY VITE_-prefixed public values. No secrets, ever.
export const clientEnv = {
  appEnv: import.meta.env.VITE_APP_ENV ?? 'development',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  paypal: {
    plan99Link: import.meta.env.VITE_PAYPAL_PLAN_99_LINK ?? '',
    plan299Link: import.meta.env.VITE_PAYPAL_PLAN_299_LINK ?? '',
    checkoutEnabled: import.meta.env.VITE_PAYPAL_CHECKOUT_ENABLED === 'true',
    webEnableLinks: import.meta.env.VITE_WEB_ENABLE_PAYPAL_LINKS !== 'false',
    iosHideExternal: import.meta.env.VITE_IOS_HIDE_EXTERNAL_PAYPAL_LINKS !== 'false',
    androidHideExternal: import.meta.env.VITE_ANDROID_HIDE_EXTERNAL_PAYPAL_LINKS !== 'false',
  },
  pwa: {
    enabled: import.meta.env.VITE_PWA_ENABLED !== 'false',
    lowPerfAuto: import.meta.env.VITE_PWA_LOW_PERFORMANCE_AUTO !== 'false',
  },
};

export const PAYPAL_LINKS = {
  pro_monthly:
    clientEnv.paypal.plan99Link || 'https://www.paypal.com/ncp/payment/WXRQLYEH8TSFJ',
  master_monthly:
    clientEnv.paypal.plan299Link || 'https://www.paypal.com/ncp/payment/NSQVJ9TZC3C88',
};
