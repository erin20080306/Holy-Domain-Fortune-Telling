import { describe, expect, it } from 'vitest';
import { buildPrompt } from './prompts';

describe('buildPrompt report tiers', () => {
  it('keeps short readings compact and distinct from paid reports', () => {
    const prompt = buildPrompt({
      category: 'ziwei',
      birth_date: '1983-06-08',
      birth_time: '03:30',
      depth: 'short',
    });

    expect(prompt.system).toContain('現在輸出的是 AI 短讀');
    expect(prompt.system).not.toContain('現在輸出的是付費深度報告');
    expect(prompt.user).toContain('【輸出層級】AI 短讀');
    expect(prompt.user).toContain('約 650–900 字');
    expect(prompt.user).toContain('不要輸出大運長論、十二宮逐宮細論');
  });

  it('requires premium reports to be long-form professional writeups', () => {
    const prompt = buildPrompt({
      category: 'bazi',
      birth_date: '1983-06-08',
      birth_time: '03:30',
      gender: '女',
      depth: 'premium',
    });

    expect(prompt.system).toContain('現在輸出的是付費深度報告');
    expect(prompt.system).not.toContain('現在輸出的是 AI 短讀');
    expect(prompt.user).toContain('【輸出層級】專業深度報告');
    expect(prompt.user).toContain('約 7600–11000 字');
    expect(prompt.user).toContain('至少 6 列');
    expect(prompt.user).toContain('老師提醒');
  });
});
