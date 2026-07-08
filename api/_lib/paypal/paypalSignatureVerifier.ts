import { getPaypalConfig } from './paypalConfig.js';
import { getHeader, type ApiRequest } from '../http.js';

let tokenCache: { token: string; expiresAt: number } | null = null;

// Obtains an OAuth access token from PayPal (client credentials).
async function getAccessToken(): Promise<string | null> {
  const cfg = getPaypalConfig();
  if (!cfg.clientId || !cfg.clientSecret) return null;
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;

  const auth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  const res = await fetch(`${cfg.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

// Verifies a PayPal webhook signature against the untouched raw body.
// Returns 'verified' | 'failed' | 'skipped' (skipped when creds absent).
export async function verifyWebhookSignature(
  req: ApiRequest,
  rawBody: Buffer,
): Promise<'verified' | 'failed' | 'skipped'> {
  const cfg = getPaypalConfig();
  if (!cfg.clientId || !cfg.clientSecret || !cfg.webhookId) return 'skipped';

  const token = await getAccessToken();
  if (!token) return 'failed';

  const body = {
    auth_algo: getHeader(req, 'paypal-auth-algo'),
    cert_url: getHeader(req, 'paypal-cert-url'),
    transmission_id: getHeader(req, 'paypal-transmission-id'),
    transmission_sig: getHeader(req, 'paypal-transmission-sig'),
    transmission_time: getHeader(req, 'paypal-transmission-time'),
    webhook_id: cfg.webhookId,
    webhook_event: JSON.parse(rawBody.toString('utf8')),
  };

  const res = await fetch(`${cfg.apiBase}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return 'failed';
  const data = (await res.json()) as { verification_status: string };
  return data.verification_status === 'SUCCESS' ? 'verified' : 'failed';
}
