import { sendJson, type ApiRequest, type ApiResponse } from '../_lib/http';
import { getAuthedUser } from '../_lib/auth';
import { ensureSubscription } from '../_lib/services/SubscriptionRepository';
import { USER_MESSAGES } from '../../shared/productCopy';

// Returns the caller's subscription. Never includes provider/model fields.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const user = await getAuthedUser(req);
  if (!user) return sendJson(res, 401, { ok: false, message: USER_MESSAGES.loginRequired });

  try {
    const sub = await ensureSubscription(user.userId);
    return sendJson(res, 200, {
      ok: true,
      subscription: {
        plan: sub.plan,
        status: sub.status,
        source: sub.source,
        current_period_end: sub.current_period_end,
      },
    });
  } catch {
    return sendJson(res, 200, { ok: false, message: USER_MESSAGES.genericError });
  }
}
