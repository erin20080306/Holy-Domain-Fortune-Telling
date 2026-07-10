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
    expect(factValue('農曆交叉校驗')).toContain('一致');
    expect(factValue('八字四柱')).toBe('年柱癸亥｜月柱戊午｜日柱丁卯｜時柱壬寅');
    expect(factValue('八字日主')).toBe('丁火');
    expect(factValue('紫微命宮')).toContain('命宮在卯');
    expect(factValue('紫微命宮')).toContain('五行局水二局');
    expect(factValue('紫微命宮主星')).toContain('太陰(陷)[科]');
  });

  it('uses the same late-rat-hour day boundary in bazi and ziwei', () => {
    const chart = buildFortuneChartData({
      category: 'ziwei',
      birthDate: '1992-11-22',
      birthTime: '23:30',
      birthPlace: '台北市',
      birthTimezone: 'Asia/Taipei',
      gender: '男',
    });

    expect(chart.facts.find((fact) => fact.label === '八字四柱')?.value).toContain('日柱癸卯');
    expect(chart.ziwei?.chineseDate).toContain('癸卯');
    expect(chart.ziwei?.time).toBe('晚子時');
    expect(chart.facts.find((fact) => fact.label === '出生地')?.value).toBe('台北市');
    expect(chart.facts.find((fact) => fact.label === '出生時區')?.value).toBe('Asia/Taipei');
  });

  it('adds complete ziwei palace facts to the prompt when required data exists', () => {
    const chart = buildFortuneChartData({
      category: 'ziwei',
      birthDate: '1983-06-08',
      birthTime: '03:30',
      gender: '女',
    });
    const promptBlock = formatFortuneChartForPrompt(chart);

    expect(promptBlock).toContain('以下資料由程式先行換算');
    expect(promptBlock).toContain('不可自行重算、改寫');
    expect(promptBlock).toContain('紫微十二宮星曜');
    expect(promptBlock).toContain('命宮 乙卯');
    expect(promptBlock).toContain('主星太陰(陷)[科]');
    expect(promptBlock).toContain('官祿宮 己未（身宮）');
  });

  it('adds complete bazi facts and luck periods when gender is provided', () => {
    const chart = buildFortuneChartData({
      category: 'bazi',
      birthDate: '1983-06-08',
      birthTime: '03:30',
      gender: '女',
    });
    const promptBlock = formatFortuneChartForPrompt(chart);

    expect(promptBlock).toContain('八字完整排盤');
    expect(promptBlock).toContain('年柱 癸亥');
    expect(promptBlock).toContain('大運：順行');
    expect(promptBlock).toContain('己未：11-20歲');
    expect(chart.notes.join('\n')).toContain('八字四柱已由系統排盤引擎');
  });

  it('warns when bazi or ziwei required inputs are missing', () => {
    const bazi = buildFortuneChartData({ category: 'bazi', birthDate: '1983-06-08' });
    const ziwei = buildFortuneChartData({
      category: 'ziwei',
      birthDate: '1983-06-08',
      birthTime: '03:30',
    });
    expect(bazi.notes.join('\n')).toContain('八字四柱需完整出生日期與出生時間');
    expect(ziwei.notes.join('\n')).toContain('紫微斗數完整排盤需出生日期、出生時間與性別');
  });
});
