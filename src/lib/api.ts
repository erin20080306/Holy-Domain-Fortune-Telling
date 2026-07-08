import { supabase } from './supabase';
import { clientEnv } from './env';

// Thin API client. Attaches the Supabase JWT so the backend can resolve the
// user from the session (never trusting a client-sent user_id).
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeaders()),
    ...(init?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${clientEnv.apiBaseUrl}${path}`, { ...init, headers });
  // Guard against non-JSON responses (e.g. 5xx HTML error pages). Returning a
  // structured object prevents callers from throwing and leaving UI stuck in a
  // loading state.
  try {
    return (await res.json()) as T;
  } catch {
    return { ok: false, message: '目前服務暫時無法使用，請稍後再試。' } as T;
  }
}

export const api = {
  getSubscription: () => request<any>('/api/me/subscription'),
  getUsage: () => request<any>('/api/me/usage'),
  bootstrap: (body: { display_name?: string; phone?: string }) =>
    request<any>('/api/me/bootstrap', { method: 'POST', body: JSON.stringify(body) }),
  createCheckout: (plan: string) =>
    request<any>('/api/paypal/create-checkout', { method: 'POST', body: JSON.stringify({ plan }) }),
  generate: (usageType: string, payload: Record<string, unknown> = {}) =>
    request<any>('/api/fortune/generate', {
      method: 'POST',
      body: JSON.stringify({ usage_type: usageType, ...payload }),
    }),
  sendContact: (body: { name: string; email: string; message: string }) =>
    request<{ ok: boolean; message?: string }>('/api/contact/send', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  admin: {
    stats: () => request<any>('/api/admin/stats'),
    users: (params: Record<string, string>) =>
      request<any>(`/api/admin/users?${new URLSearchParams(params).toString()}`),
    updateSubscription: (userId: string, body: Record<string, unknown>) =>
      request<any>(`/api/admin/users/${userId}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    sendPasswordReset: (userId: string) =>
      request<{ ok: boolean; message?: string }>(
        `/api/admin/users/${userId}/reset-password`,
        { method: 'POST' },
      ),
    unmatchedPayments: () => request<any>('/api/admin/payments/unmatched'),
    matchPayment: (eventId: string, body: Record<string, unknown>) =>
      request<any>(`/api/admin/payments/${eventId}/match`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    auditLogs: (page = 1) => request<any>(`/api/admin/audit-logs?page=${page}`),
  },
};
