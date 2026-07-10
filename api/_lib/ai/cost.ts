// Rough cost estimation for internal accounting only. Rates are USD per 1M
// tokens and are intentionally conservative; adjust to match current provider
// pricing. Never exposed to the client.

interface Rate {
  in: number; // USD per 1M input tokens
  out: number; // USD per 1M output tokens
}

const RATES: Record<string, Rate> = {
  gemini: { in: 0.25, out: 1.5 },
  anthropic: { in: 3.0, out: 15.0 },
};

export function estimateCostUsd(
  provider: 'gemini' | 'anthropic',
  inputTokens: number,
  outputTokens: number,
): number {
  const r = RATES[provider] ?? { in: 0, out: 0 };
  const cost = (inputTokens / 1_000_000) * r.in + (outputTokens / 1_000_000) * r.out;
  // Round to 5 decimals to match ai_usage_logs.estimated_cost_usd numeric(10,5).
  return Math.round(cost * 100000) / 100000;
}
