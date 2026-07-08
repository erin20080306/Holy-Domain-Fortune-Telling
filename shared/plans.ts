// Central plan + entitlement definitions. Shared by the frontend (display only)
// and the backend (enforcement). Limits can be overridden via env on the server.

export type PlanId = 'free' | 'pro_monthly' | 'master_monthly';

export type SubscriptionStatus =
  | 'none'
  | 'pending'
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'suspended'
  | 'manual_active';

export type SubscriptionSource =
  | 'free'
  | 'paypal'
  | 'apple_iap'
  | 'google_play'
  | 'admin_manual';

export type UsageType =
  | 'short_reading'
  | 'premium_report'
  | 'premium_chat'
  | 'tarot'
  | 'bazi'
  | 'ziwei';

export interface PlanLimits {
  shortAiPerMonth: number;
  premiumReportPerMonth: number;
  premiumChatPerMonth: number;
  tarotPerDay: number;
}

// Defaults mirror .env.example. The server reads env in shared/env.ts.
export const DEFAULT_PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    shortAiPerMonth: 3,
    premiumReportPerMonth: 0,
    premiumChatPerMonth: 0,
    tarotPerDay: 1,
  },
  pro_monthly: {
    shortAiPerMonth: 30,
    premiumReportPerMonth: 2,
    premiumChatPerMonth: 30,
    tarotPerDay: 99,
  },
  master_monthly: {
    shortAiPerMonth: 100,
    premiumReportPerMonth: 8,
    premiumChatPerMonth: 150,
    tarotPerDay: 99,
  },
};

export interface PlanDisplay {
  id: PlanId;
  title: string;
  price: string;
  features: string[];
  buttonText: string;
  paypalLinkEnvKey?: 'VITE_PAYPAL_PLAN_99_LINK' | 'VITE_PAYPAL_PLAN_299_LINK';
}

// Product-facing plan copy. NEVER reference model / provider names here.
export const PLAN_DISPLAY: PlanDisplay[] = [
  {
    id: 'free',
    title: '見習星辰',
    price: 'NT$0 / 永久',
    features: [
      '每日塔羅 1 次',
      '星座 / 生肖 / 生命靈數',
      '每月 3 次命理短解讀',
      '基礎命理功能',
      '不含 3,000 字（約 2–3 頁 A4）深度命理報告',
    ],
    buttonText: '開始免費使用',
  },
  {
    id: 'pro_monthly',
    title: '星河行者',
    price: 'NT$99 / 月',
    features: [
      '每月 2 份 3,000 字（約 2–3 頁 A4）深度命理報告',
      '每月 30 次命理短解讀',
      '每月 30 則進階命理老師對話',
      '無廣告',
      '可保存歷史報告',
    ],
    buttonText: '使用 PayPal 訂閱 NT$99',
    paypalLinkEnvKey: 'VITE_PAYPAL_PLAN_99_LINK',
  },
  {
    id: 'master_monthly',
    title: '宇宙共鳴',
    price: 'NT$299 / 月',
    features: [
      '每月 8 份 3,000 字（約 2–3 頁 A4）深度命理報告',
      '每月 100 次命理短解讀',
      '每月 150 則進階命理老師對話',
      '優先客服',
      '無廣告',
      '可保存歷史報告',
    ],
    buttonText: '使用 PayPal 訂閱 NT$299',
    paypalLinkEnvKey: 'VITE_PAYPAL_PLAN_299_LINK',
  },
];

export const PLAN_LABEL: Record<PlanId, string> = {
  free: '見習星辰',
  pro_monthly: '星河行者',
  master_monthly: '宇宙共鳴',
};
