import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { isMissingSupabaseSchemaError } from '../supabaseErrors.js';

export interface ReadingHistoryItem {
  id: string;
  usage_type: 'premium_report';
  category: string;
  title: string;
  question: string | null;
  content: string;
  input_snapshot: Record<string, string>;
  created_at: string;
}

const CATEGORY_NAME: Record<string, string> = {
  bazi: '八字流年',
  ziwei: '紫微斗數',
  zodiac: '生肖太歲',
  astro: '星盤占星',
  tarot: '塔羅神諭',
  iching: '易經占卜',
  name: '姓名五行',
  face: '面相解析',
  palm: '掌紋密碼',
  fengshui: '居家風水',
  numerology: '生命靈數',
  humandesign: '人類圖',
};

const SNAPSHOT_KEYS = [
  'name',
  'gender',
  'birth_date',
  'birth_time',
  'birth_place',
] as const;

function shortString(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, limit) : undefined;
}

function inputSnapshot(body: Record<string, unknown>): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const key of SNAPSHOT_KEYS) {
    const value = shortString(body[key], 200);
    if (value) snapshot[key] = value;
  }
  return snapshot;
}

export async function saveDeepReport(params: {
  userId: string;
  body: Record<string, unknown>;
  content: string;
}): Promise<string | null> {
  const category = shortString(params.body.category, 40) ?? 'general';
  const question = shortString(params.body.question, 1000) ?? null;
  const title = `${CATEGORY_NAME[category] ?? '綜合命理'}深度報告`;
  const { data, error } = await getSupabaseAdmin()
    .from('fortune_readings')
    .insert({
      user_id: params.userId,
      usage_type: 'premium_report',
      category,
      title,
      question,
      content: params.content,
      input_snapshot: inputSnapshot(params.body),
    })
    .select('id')
    .single();

  if (error) {
    if (isMissingSupabaseSchemaError(error)) return null;
    throw error;
  }
  return data?.id ?? null;
}

export async function listDeepReports(
  userId: string,
  page: number,
  pageSize: number,
): Promise<{ readings: ReadingHistoryItem[]; total: number; available: boolean }> {
  const from = (page - 1) * pageSize;
  const { data, count, error } = await getSupabaseAdmin()
    .from('fortune_readings')
    .select('id, usage_type, category, title, question, content, input_snapshot, created_at', {
      count: 'exact',
    })
    .eq('user_id', userId)
    .eq('usage_type', 'premium_report')
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) {
    if (isMissingSupabaseSchemaError(error)) {
      return { readings: [], total: 0, available: false };
    }
    throw error;
  }
  return {
    readings: (data ?? []) as ReadingHistoryItem[],
    total: count ?? 0,
    available: true,
  };
}

export async function deleteDeepReport(userId: string, readingId: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('fortune_readings')
    .delete()
    .eq('id', readingId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  if (error) {
    if (isMissingSupabaseSchemaError(error)) return false;
    throw error;
  }
  return Boolean(data?.id);
}

