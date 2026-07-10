import { describe, expect, it } from 'vitest';
import { buildFortuneChartData, formatFortuneChartForPrompt } from './fortuneChart';

function factValue(label: string): string {
  const chart = buildFortuneChartData({
    category: 'ziwei',
    birthDate: '1983-06-08',
    birthTime: '03:30',
    gender: '女',
  });
  return chart.facts.find((fact) => fact.label === label)?.value ?? '';
}

describe('fortune chart data', () => {
  it('builds deterministic chart facts before AI interpretation', () => {
    expect(factValue('出生農曆')).toContain('癸亥年四月廿七日');
    expect(factValue('生肖')).toBe('豬');
    expect(factValue('農曆年干支')).toBe('癸亥年');
    expect(factValue('命理時辰')).toBe('寅時（03:00-04:59）');
    expect(factValue('時辰地支')).toBe('寅（時支）');
    expect(factValue('生命靈數')).toContain('8');
  });

  it('tells the prompt to use chart facts without inventing missing ziwei placements', () => {
    const chart = buildFortuneChartData({
      category: 'ziwei',
      birthDate: '1983-06-08',
      birthTime: '03:30',
    });
    const promptBlock = formatFortuneChartForPrompt(chart);

    expect(promptBlock).toContain('以下資料由程式先行換算');
    expect(promptBlock).toContain('不可自行重算、改寫');
    expect(promptBlock).toContain('不得虛構主星、四化或宮位落點');
  });

  it('warns bazi readings not to invent full pillars or major luck cycles', () => {
    const chart = buildFortuneChartData({ category: 'bazi', birthDate: '1983-06-08' });
    expect(chart.notes.join('\n')).toContain('完整八字四柱');
    expect(chart.notes.join('\n')).toContain('不得把未提供的四柱或大運寫成確定結果');
  });
});
