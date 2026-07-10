// Server-only AI provider calls via REST (no SDK dependency). Provider and
// model names are NEVER surfaced to the client.

export interface ProviderResult {
  text: string;
  provider: 'gemini' | 'anthropic';
  model: string;
  inputTokens: number;
  outputTokens: number;
}

const TIMEOUT_MS = 55_000;

async function fetchWithTimeout(input: string | URL, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<ProviderResult | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 8192 },
    }),
  });

  if (!res.ok) return null;
  const data: any = await res.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p?.text ?? '')
    .join('')
    .trim();
  if (!text) return null;
  const usage = data?.usageMetadata ?? {};
  return {
    text,
    provider: 'gemini',
    model,
    inputTokens: Number(usage.promptTokenCount ?? 0),
    outputTokens: Number(usage.candidatesTokenCount ?? 0),
  };
}

export async function callClaude(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<ProviderResult | null> {
  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      temperature: 0.8,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) return null;
  const data: any = await res.json();
  const text = (data?.content ?? [])
    .map((b: any) => (b?.type === 'text' ? b.text : ''))
    .join('')
    .trim();
  if (!text) return null;
  const usage = data?.usage ?? {};
  return {
    text,
    provider: 'anthropic',
    model,
    inputTokens: Number(usage.input_tokens ?? 0),
    outputTokens: Number(usage.output_tokens ?? 0),
  };
}
