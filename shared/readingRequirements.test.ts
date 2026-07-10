import { describe, expect, it } from 'vitest';
import { validateReadingRequirements } from './readingRequirements';
import { FORTUNE_CATEGORIES } from './categories';

describe('reading input requirements', () => {
  it('requires complete chart data for bazi and ziwei', () => {
    expect(validateReadingRequirements({ usage: 'short_reading', category: 'bazi' })).toContain('出生年月日');
    expect(
      validateReadingRequirements({
        usage: 'short_reading',
        category: 'ziwei',
        birthDate: '1983-06-08',
        birthTime: '03:30',
        gender: '女',
      }),
    ).toBeNull();
  });

  it('does not spend deep-report quota on guidance-only categories', () => {
    expect(
      validateReadingRequirements({
        usage: 'premium_report',
        category: 'astro',
        birthDate: '1983-06-08',
        birthTime: '03:30',
        birthPlace: '台北市',
      }),
    ).toContain('不會扣除深度報告額度');
    expect(
      FORTUNE_CATEGORIES.filter((category) => category.calculationLevel === 'guided').every(
        (category) => !category.supportsDeepReport,
      ),
    ).toBe(true);
  });

  it('requires a focused question for divination and described observations', () => {
    expect(validateReadingRequirements({ usage: 'tarot', category: 'tarot' })).toContain('具體問題');
    expect(validateReadingRequirements({ usage: 'short_reading', category: 'palm' })).toContain('描述');
  });

  it('keeps tarot and general short-reading quotas separate', () => {
    expect(
      validateReadingRequirements({
        usage: 'tarot',
        category: 'numerology',
        birthDate: '1983-06-08',
      }),
    ).toContain('僅能用於塔羅');
    expect(
      validateReadingRequirements({
        usage: 'short_reading',
        category: 'tarot',
        question: '近期適合轉職嗎？',
      }),
    ).toContain('獨立的塔羅次數');
  });
});
