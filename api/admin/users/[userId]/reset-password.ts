import { sendJson, getHeader, type ApiRequest, type ApiResponse } from '../../../_lib/http.js';
import { getAuthedUser, isAdmin } from '../../../_lib/auth.js';
import { getSupabaseAdmin } from '../../../_lib/supabaseAdmin.js';
import { writeAuditLog } from '../../../_lib/services/AdminAuditService.js';
import { serverEnv } from '../../../_lib/env.js';
import { USER_MESSAGES } from '../../../../shared/productCopy.js';

// Admin triggers a password-reset email for a specific user. We generate the
// recovery link with the Supabase Admin API and deliver it ourselves via Resend
// so it never depends on Supabase's built-in (rate-limited) mail service.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const admin = await getAuthedUser(req);
  if (!isAdmin(admin)) return sendJson(res, 403, { ok: false, message: USER_MESSAGES.genericError });
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false });

  const targetUserId =
    (Array.isArray(req.query?.userId) ? req.query?.userId[0] : req.query?.userId) ?? '';
  if (!targetUserId) return sendJson(res, 400, { ok: false });

  const sb = getSupabaseAdmin();

  // Resolve the target user's email.
  const { data: profile, error: pErr } = await sb
    .from('user_profiles')
    .select('email')
    .eq('user_id', targetUserId)
    .single();
  const email = (profile as { email?: string } | null)?.email;
  if (pErr || !email) return sendJson(res, 404, { ok: false, message: '找不到該使用者的 Email。' });

  // Build the redirect origin from the incoming request (falls back to Supabase host).
  const proto = (getHeader(req, 'x-forwarded-proto') || 'https').split(',')[0].trim();
  const host =
    (getHeader(req, 'x-forwarded-host') || getHeader(req, 'host') || '').split(',')[0].trim();
  const origin = host ? `${proto}://${host}` : '';
  const redirectTo = origin ? `${origin}/reset-password` : undefined;

  // Generate a recovery link (does NOT send an email by itself).
  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: redirectTo ? { redirectTo } : undefined,
  });
  const actionLink = (linkData as any)?.properties?.action_link as string | undefined;
  if (linkErr || !actionLink)
    return sendJson(res, 502, { ok: false, message: '無法產生重設連結，請稍後再試。' });

  // Deliver the link via Resend.
  const { resendApiKey, fromEmail } = serverEnv.contact;
  if (!resendApiKey) return sendJson(res, 503, { ok: false, message: '寄信服務尚未設定。' });

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: '【神聖命理】密碼重設連結',
      html: `
        <div style="font-family:sans-serif;line-height:1.7;color:#222">
          <h2 style="color:#8a744f">重設你的密碼</h2>
          <p>您好，我們收到重設密碼的請求。請點擊下方按鈕設定新密碼：</p>
          <p style="margin:24px 0">
            <a href="${actionLink}"
               style="background:#A89882;color:#050508;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600">
              重設密碼
            </a>
          </p>
          <p style="color:#888;font-size:13px">若您沒有提出此請求，請忽略這封信，您的密碼不會變更。</p>
        </div>`,
      text: `重設你的密碼：${actionLink}\n\n若您沒有提出此請求，請忽略這封信。`,
    }),
  });

  if (!resp.ok) return sendJson(res, 502, { ok: false, message: '寄送失敗，請稍後再試。' });

  await writeAuditLog({
    adminUserId: admin.userId,
    targetUserId,
    action: 'send_password_reset',
    before: null,
    after: { email },
    note: null,
  });

  return sendJson(res, 200, { ok: true });
}
