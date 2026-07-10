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
    expect(prompt.user).toContain('約 4,500–6,500 字');
    expect(prompt.user).toContain('每表 4–6 列');
    expect(prompt.user).toContain('老師提醒');
  });

  it('positions chat as short follow-up guidance on charts and reports', () => {
    const prompt = buildPrompt({
      mode: 'chat',
      category: 'ziwei',
      birth_date: '1983-06-08',
      birth_time: '03:30',
      report_context: '最近一次深度報告摘要：性格底盤偏重敏感、洞察與防衛。',
      question: '感情盲點可以再說清楚嗎？',
      history: [{ role: 'assistant', text: '你在關係中容易先觀察再靠近。' }],
    });

    expect(prompt.system).toContain('針對使用者的命盤、AI短讀與深度報告進行追問');
    expect(prompt.system).toContain('每次回覆約 150–350 字');
    expect(prompt.user).toContain('【最近一次短讀／深度報告摘要】');
    expect(prompt.user).toContain('不要重寫整份深度報告');
    expect(prompt.user).toContain('訪客：感情盲點可以再說清楚嗎？');
  });
});
