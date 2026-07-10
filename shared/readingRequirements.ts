import { getFortuneCategory } from './categories.js';
import type { UsageType } from './plans.js';

export interface ReadingRequirementInput {
  usage: UsageType;
  category?: string;
  question?: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
}

function missing(value: string | undefined): boolean {
  return !value?.trim();
}

export function validateReadingRequirements(input: ReadingRequirementInput): string | null {
  const category = getFortuneCategory(input.category);
  if (!category) return '請先選擇命理項目。';

  if (input.usage === 'tarot' && category.id !== 'tarot') {
    return '塔羅次數僅能用於塔羅神諭。';
  }
  if (category.id === 'tarot' && input.usage !== 'tarot') {
    return '塔羅神諭會使用獨立的塔羅次數，請重新開始抽牌。';
  }

  if (input.usage === 'premium_report' && !category.supportsDeepReport) {
    return '此項目目前尚未接上完整排盤引擎，因此不會扣除深度報告額度。請改用八字、紫微、生肖或生命靈數。';
  }

  if (['bazi', 'ziwei'].includes(category.id)) {
    if (missing(input.birthDate) || missing(input.birthTime) || missing(input.gender)) {
      return `${category.name}完整排盤需要出生年月日、出生時間與性別。`;
    }
  }

  if (['zodiac', 'numerology'].includes(category.id) && missing(input.birthDate)) {
    return `${category.name}需要完整出生年月日。`;
  }

  if (['astro', 'humandesign'].includes(category.id)) {
    if (missing(input.birthDate) || missing(input.birthTime) || missing(input.birthPlace)) {
      return `${category.name}至少需要出生年月日、出生時間與出生城市；目前僅提供通則指引。`;
    }
  }

  if (category.id === 'name' && missing(input.name)) {
    return '姓名五行需要完整姓名。';
  }

  if (['tarot', 'iching'].includes(category.id) && missing(input.question)) {
    return `${category.name}需要一個具體問題，才能聚焦解讀。`;
  }

  if (['face', 'palm', 'fengshui'].includes(category.id) && missing(input.question)) {
    return `${category.name}目前為通則指引，請在問題欄描述你觀察到的特徵或格局。`;
  }

  return null;
}
