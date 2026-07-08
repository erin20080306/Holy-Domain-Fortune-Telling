import { serverEnv } from '../env.js';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { buildPrompt, type ReadingInputs, type ChatTurn } from './prompts.js';
import { callClaude, callGemini, type ProviderResult } from './providers.js';
import { estimateCostUsd } from './cost.js';
import type { UsageType } from '../../../shared/plans.js';

function parseHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is { role: string; text: string } => !!t && typeof t.text === 'string')
    .slice(-8)
    .map((t) => ({ role: t.role === 'assistant' ? 'assistant' : 'user', text: String(t.text) }));
}

// Best-effort internal usage/cost logging. Never throws into the caller.
async function logUsage(
  userId: string | undefined,
  usage: UsageType,
  r: ProviderResult,
): Promise<void> {
  if (!userId) return;
  try {
    await getSupabaseAdmin()
      .from('ai_usage_logs')
      .insert({
        user_id: userId,
        usage_type: usage,
        internal_provider: r.provider,
        internal_model: r.model,
        estimated_cost_usd: estimateCostUsd(r.provider, r.inputTokens, r.outputTokens),
      });
  } catch {
    // logging must never break a reading
  }
}

// Produces a fortune reading. Premium tiers (deep report / chat) prefer Claude;
// short readings / tarot prefer Gemini. Falls back to whichever provider has a
// configured key. Returns null when no provider is available or all calls fail.
export async function generateReading(
  usage: UsageType,
  body: Record<string, unknown>,
  userId?: string,
): Promise<string | null> {
  const premium = usage === 'premium_report' || usage === 'premium_chat';

  const inputs: ReadingInputs = {
    category: typeof body.category === 'string' ? body.category : undefined,
    question: typeof body.question === 'string' ? body.question : undefined,
    name: typeof body.name === 'string' ? body.name : undefined,
    gender: typeof body.gender === 'string' ? body.gender : undefined,
    birth_date: typeof body.birth_date === 'string' ? body.birth_date : undefined,
    birth_time: typeof body.birth_time === 'string' ? body.birth_time : undefined,
    birth_place: typeof body.birth_place === 'string' ? body.birth_place : undefined,
    depth: premium ? 'premium' : 'short',
    mode: usage === 'premium_chat' ? 'chat' : 'reading',
    history: usage === 'premium_chat' ? parseHistory(body.history) : undefined,
  };

  const { system, user } = buildPrompt(inputs);
  const { anthropicKey, claudeModel, geminiKey, geminiModel } = serverEnv.ai;

  // Provider preference order by tier, filtered to those with keys.
  const chain: Array<() => Promise<ProviderResult | null>> = [];
  const claude = () => callClaude(anthropicKey, claudeModel, system, user);
  const gemini = () => callGemini(geminiKey, geminiModel, system, user);

  if (premium) {
    if (anthropicKey) chain.push(claude);
    if (geminiKey) chain.push(gemini);
  } else {
    if (geminiKey) chain.push(gemini);
    if (anthropicKey) chain.push(claude);
  }

  for (const call of chain) {
    try {
      const result = await call();
      if (result?.text) {
        await logUsage(userId, usage, result);
        return result.text;
      }
    } catch {
      // try next provider
    }
  }
  return null;
}
