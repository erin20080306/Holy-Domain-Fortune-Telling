// Server-only env access. NEVER import this from client (src/) code.
import type { PlanId, PlanLimits } from '../../shared/plans.js';

function num(key: string, fallback: number): number {
  const v = process.env[key];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function bool(key: string, fallback = false): boolean {
  const v = process.env[key];
  if (v === undefined) return fallback;
  return v === 'true' || v === '1';
}

export const serverEnv = {
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY ?? '',

  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  adminDebugProviderVisible: bool('ADMIN_DEBUG_AI_PROVIDER_VISIBLE', false),

  timezone: process.env.FORTUNE_TIMEZONE ?? 'Asia/Taipei',

  contact: {
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    toEmail: process.env.CONTACT_TO_EMAIL ?? 'erin20080306@gmail.com',
    fromEmail: process.env.RESEND_FROM_EMAIL ?? 'MYSTIC 客服 <onboarding@resend.dev>',
  },

  ai: {
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
    // Premium tier model (deep reports / chat). Override via env.
    claudeModel: process.env.CLAUDE_MODEL_PREMIUM || 'claude-sonnet-5',
    geminiKey: process.env.GEMINI_API_KEY ?? '',
    // Free tier model (short readings / tarot). Override via env.
    geminiModel: process.env.GEMINI_MODEL_FREE || 'gemini-3.1-flash-lite',
  },

  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID ?? '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? '',
    webhookId: process.env.PAYPAL_WEBHOOK_ID ?? '',
    env: (process.env.PAYPAL_ENV ?? 'sandbox') as 'sandbox' | 'live',
    plan99: {
      id: process.env.PAYPAL_PLAN_99_ID ?? 'pro_monthly',
      priceTwd: num('PAYPAL_PLAN_99_PRICE_TWD', 99),
      link:
        process.env.PAYPAL_PLAN_99_LINK ??
        'https://www.paypal.com/ncp/payment/WXRQLYEH8TSFJ',
    },
    plan299: {
      id: process.env.PAYPAL_PLAN_299_ID ?? 'master_monthly',
      priceTwd: num('PAYPAL_PLAN_299_PRICE_TWD', 299),
      link:
        process.env.PAYPAL_PLAN_299_LINK ??
        'https://www.paypal.com/ncp/payment/NSQVJ9TZC3C88',
    },
    checkoutEnabled: bool('PAYPAL_CHECKOUT_ENABLED', false),
    webEnableLinks: bool('WEB_ENABLE_PAYPAL_LINKS', true),
    iosHideExternal: bool('IOS_HIDE_EXTERNAL_PAYPAL_LINKS', true),
    androidHideExternal: bool('ANDROID_HIDE_EXTERNAL_PAYPAL_LINKS', true),
  },
};

export function planLimitsFromEnv(): Record<PlanId, PlanLimits> {
  return {
    free: {
      shortAiPerMonth: num('PLAN_FREE_SHORT_AI_LIMIT', 3),
      premiumReportPerMonth: 0,
      premiumChatPerMonth: 0,
      tarotPerDay: 1,
    },
    pro_monthly: {
      shortAiPerMonth: num('PLAN_PRO_SHORT_AI_LIMIT', 30),
      premiumReportPerMonth: num('PLAN_PRO_PREMIUM_REPORT_LIMIT', 2),
      premiumChatPerMonth: num('PLAN_PRO_CHAT_LIMIT', 30),
      tarotPerDay: 99,
    },
    master_monthly: {
      shortAiPerMonth: num('PLAN_MASTER_SHORT_AI_LIMIT', 100),
      premiumReportPerMonth: num('PLAN_MASTER_PREMIUM_REPORT_LIMIT', 8),
      premiumChatPerMonth: num('PLAN_MASTER_CHAT_LIMIT', 200),
      tarotPerDay: 99,
    },
  };
}
