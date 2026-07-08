/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_PAYPAL_PLAN_99_LINK?: string;
  readonly VITE_PAYPAL_PLAN_299_LINK?: string;
  readonly VITE_PAYPAL_CHECKOUT_ENABLED?: string;
  readonly VITE_WEB_ENABLE_PAYPAL_LINKS?: string;
  readonly VITE_IOS_HIDE_EXTERNAL_PAYPAL_LINKS?: string;
  readonly VITE_ANDROID_HIDE_EXTERNAL_PAYPAL_LINKS?: string;
  readonly VITE_PWA_ENABLED?: string;
  readonly VITE_PWA_LOW_PERFORMANCE_AUTO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
