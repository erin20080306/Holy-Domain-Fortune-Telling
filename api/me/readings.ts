import { getAuthedUser } from '../_lib/auth.js';
import { readRawBody, sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import {
  deleteDeepReport,
  listDeepReports,
} from '../_lib/services/ReadingHistoryRepository.js';
import { USER_MESSAGES } from '../../shared/productCopy.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const user = await getAuthedUser(req);
  if (!user) return sendJson(res, 401, { ok: false, message: USER_MESSAGES.loginRequired });

  try {
    if (req.method === 'GET') {
      const value = (key: string) => {
        const raw = req.query?.[key];
        return Array.isArray(raw) ? raw[0] : raw;
      };
      const page = Math.max(1, Number(value('page')) || 1);
      const pageSize = Math.min(20, Math.max(1, Number(value('pageSize')) || 10));
      const result = await listDeepReports(user.userId, page, pageSize);
      return sendJson(res, 200, { ok: true, ...result, page, pageSize });
    }

    if (req.method === 'DELETE') {
      const raw = await readRawBody(req);
      const body = raw.length ? JSON.parse(raw.toString('utf8')) : {};
      const readingId = typeof body.reading_id === 'string' ? body.reading_id : '';
      if (!UUID.test(readingId)) return sendJson(res, 400, { ok: false });
      const deleted = await deleteDeepReport(user.userId, readingId);
      return sendJson(res, deleted ? 200 : 404, { ok: deleted });
    }

    return sendJson(res, 405, { ok: false });
  } catch {
    return sendJson(res, 200, { ok: false, message: USER_MESSAGES.genericError });
  }
}
