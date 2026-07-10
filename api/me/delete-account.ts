import { getAuthedUser } from '../_lib/auth.js';
import { readRawBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { getSubscription } from '../_lib/services/SubscriptionRepository.js';
import { USER_MESSAGES } from '../../shared/productCopy.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const user = await getAuthedUser(req);
  if (!user) return sendJson(res, 401, { ok: false, message: USER_MESSAGES.loginRequired });
  if (req.method !== 'DELETE') return sendJson(res, 405, { ok: false });

  try {
    const raw = await readRawBody(req);
    const body = raw.length ? JSON.parse(raw.toString('utf8')) : {};
    if (body.confirm !== 'DELETE') {
      return sendJson(res, 400, { ok: false, message: '刪除確認文字不正確。' });
    }

    const subscription = await getSubscription(user.userId);
    if (
      subscription?.source === 'paypal' &&
      ['active', 'manual_active', 'pending'].includes(subscription.status)
    ) {
      return sendJson(res, 409, {
        ok: false,
        reason: 'active_payment',
        message: '此帳號仍有 PayPal 訂閱或付款核對中。請先取消訂閱並聯絡客服確認，再刪除帳號。',
      });
    }

    const { error } = await getSupabaseAdmin().auth.admin.deleteUser(user.userId);
    if (error) throw error;
    return sendJson(res, 200, { ok: true });
  } catch {
    return sendJson(res, 200, { ok: false, message: USER_MESSAGES.genericError });
  }
}
