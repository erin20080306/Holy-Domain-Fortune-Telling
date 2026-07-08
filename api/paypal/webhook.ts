import { readRawBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getHeader } from '../_lib/http.js';
import { verifyWebhookSignature } from '../_lib/paypal/paypalSignatureVerifier.js';
import { handleWebhookEvent } from '../_lib/paypal/paypalWebhookHandler.js';

// Vercel: disable automatic body parsing so we can verify the raw signature.
export const config = { api: { bodyParser: false } };

// PayPal webhook. Reads raw body, verifies signature, updates plan idempotently.
// Responds fast; never generates AI content here.
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false });
  }

  try {
    const raw = await readRawBody(req);
    const payload = raw.length ? JSON.parse(raw.toString('utf8')) : {};

    const eventId: string =
      payload?.id || getHeader(req, 'paypal-transmission-id') || '';
    const eventType: string = payload?.event_type || 'UNKNOWN';

    if (!eventId) {
      // Acknowledge to avoid retries storm, but record nothing actionable.
      return sendJson(res, 200, { ok: true });
    }

    const verificationStatus = await verifyWebhookSignature(req, raw);
    const result = await handleWebhookEvent({
      eventId,
      eventType,
      payload,
      verificationStatus,
    });

    return sendJson(res, 200, { ok: true, status: result.status });
  } catch {
    // Never leak stack traces. Return 200 so PayPal doesn't hammer retries,
    // the event simply won't be recorded and can be reconciled by an admin.
    return sendJson(res, 200, { ok: true });
  }
}
