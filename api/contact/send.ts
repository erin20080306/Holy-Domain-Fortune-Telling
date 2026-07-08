import { readRawBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { serverEnv } from '../_lib/env.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public contact form. Sends the visitor's message to the support inbox via
// Resend so delivery does not depend on the visitor having a mail client.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false });

  try {
    const raw = await readRawBody(req);
    const body = raw.length ? JSON.parse(raw.toString('utf8')) : {};

    const name = String(body?.name ?? '').trim().slice(0, 100);
    const email = String(body?.email ?? '').trim().slice(0, 200);
    const message = String(body?.message ?? '').trim().slice(0, 5000);

    if (!name || !email || !message) {
      return sendJson(res, 400, { ok: false, message: '請填寫姓名、Email 與訊息內容。' });
    }
    if (!EMAIL_RE.test(email)) {
      return sendJson(res, 400, { ok: false, message: 'Email 格式不正確。' });
    }

    const { resendApiKey, toEmail, fromEmail } = serverEnv.contact;
    if (!resendApiKey) {
      return sendJson(res, 503, { ok: false, message: '客服信箱尚未設定，請稍後再試。' });
    }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `【MYSTIC 客服】來自 ${name} 的訊息`,
        text: `姓名：${name}\nEmail：${email}\n\n訊息內容：\n${message}`,
      }),
    });

    if (!resp.ok) {
      return sendJson(res, 502, { ok: false, message: '寄送失敗，請稍後再試。' });
    }

    return sendJson(res, 200, { ok: true });
  } catch {
    return sendJson(res, 500, { ok: false, message: '寄送失敗，請稍後再試。' });
  }
}
