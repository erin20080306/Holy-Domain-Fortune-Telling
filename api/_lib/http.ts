// Minimal Vercel Node function request/response typing so we don't force a
// hard dependency on @vercel/node during CI. Compatible with the real runtime.
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ApiRequest extends IncomingMessage {
  method?: string;
  query?: Record<string, string | string[]>;
  body?: any;
  headers: IncomingMessage['headers'];
}

export interface ApiResponse extends ServerResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
}

export function sendJson(res: ApiResponse, code: number, body: unknown): void {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

// Reads the raw request body as a Buffer. Required for PayPal webhook signature
// verification, which must run against the untouched bytes.
export async function readRawBody(req: ApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function getHeader(req: ApiRequest, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}
