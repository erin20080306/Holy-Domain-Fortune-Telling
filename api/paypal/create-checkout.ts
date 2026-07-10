import { readRawBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getAuthedUser } from '../_lib/auth.js';
import { mapCheckoutPlan } from '../_lib/paypal/paypalPlanMapper.js';
import { createPendingCheckout } from '../_lib/paypal/paypalPendingCheckoutService.js';
import { USER_MESSAGES } from '../../shared/productCopy.js';

// Creates a pending checkout and returns ONLY the checkout_url. The client
// never receives secrets. Clicking PayPal does NOT activate the plan.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false });

  const user = await getAuthedUser(req);
  if (!user) return sendJson(res, 401, { ok: false, message: USER_MESSAGES.loginRequired });

  try {
    const raw = await readRawBody(req);
    const body = raw.length ? JSON.parse(raw.toString('utf8')) : {};
    const plan = mapCheckoutPlan(body?.plan);
    if (!plan || plan === 'free') {
      return sendJson(res, 400, { ok: false, message: USER_MESSAGES.genericError });
    }

    const pending = await createPendingCheckout(user.userId, plan);
    return sendJson(res, 200, {
      ok: true,
      checkout_url: pending.checkoutUrl,
      checkout_token: pending.checkoutToken,
      checkout_mode: pending.checkoutMode,
    });
  } catch {
    return sendJson(res, 200, { ok: false, message: USER_MESSAGES.paymentConfirming });
  }
}
