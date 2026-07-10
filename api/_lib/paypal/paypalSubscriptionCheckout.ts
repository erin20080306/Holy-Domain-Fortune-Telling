import { getPaypalConfig } from './paypalConfig.js';

interface PaypalLink {
  href?: string;
  rel?: string;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function isPaypalBillingPlanId(value: string): boolean {
  return /^P-[A-Z0-9]+$/i.test(value.trim());
}

export function findPaypalApprovalUrl(links: PaypalLink[] | undefined): string | null {
  return links?.find((link) => link.rel === 'approve' && link.href)?.href ?? null;
}

async function getAccessToken(): Promise<string | null> {
  const cfg = getPaypalConfig();
  if (!cfg.clientId || !cfg.clientSecret) return null;

  const credentials = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  const response = await fetchWithTimeout(`${cfg.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as { access_token?: string };
  return payload.access_token ?? null;
}

export async function createPaypalSubscriptionApproval(params: {
  billingPlanId: string;
  checkoutToken: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<string | null> {
  if (!isPaypalBillingPlanId(params.billingPlanId)) return null;

  const cfg = getPaypalConfig();
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const response = await fetchWithTimeout(`${cfg.apiBase}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      plan_id: params.billingPlanId,
      custom_id: params.checkoutToken,
      application_context: {
        brand_name: 'MYSTIC',
        locale: 'zh-TW',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
      },
    }),
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as { links?: PaypalLink[] };
  return findPaypalApprovalUrl(payload.links);
}
