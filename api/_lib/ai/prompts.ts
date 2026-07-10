// Builds the system + user prompts for each 命理 category. All copy is
// Traditional Chinese and the persona never mentions being an AI / model.

import {
  CHINESE_HOUR_RULE_TEXT,
} from '../../../shared/chineseTime.js';
import { buildFortuneChartData, formatFortuneChartForPrompt } from '../../../shared/fortuneChart.js';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ReadingInputs {
  category?: string;
  question?: string;
  name?: string;
  gender?: string;
  birth_date?: string; // YYYY-MM-DD
  birth_time?: string; // HH:mm
  birth_place?: string;
  report_context?: string;
  depth?: 'short' | 'premium';
  mode?: 'reading' | 'chat';
  history?: ChatTurn[];
}

interface CategoryMeta {
  name: string;
  focus: string;
  needsBirth?: boolean;
  needsName?: boolean;
}

const CATEGORIES: Record<string, CategoryMeta> = {
  bazi: { name: '八字流年', focus: '以系統排盤資料校對出生曆法與時辰，再分析個性、事業、財運、感情與近年節奏', needsBirth: true },
  ziwei: { name: '紫微斗數', focus: '以系統農曆生日與命理時辰做命盤校對，再分析人生方向、事業、感情與財帛等細節', needsBirth: true },
  zodiac: { name: '生肖太歲', focus: '依生肖看今年沖合刑害與年度運勢方向', needsBirth: true },
  astro: { name: '星盤占星', focus: '以日月升與行星位置解析性格、人際與近期行運', needsBirth: true },
  tarot: { name: '塔羅神諭', focus: '依抽出的牌陣解讀目前狀況、阻礙與可能走向' },
  iching: { name: '易經占卜', focus: '以卦象判斷事情的變化趨勢與當下宜忌' },
  name: { name: '姓名五行', focus: '依姓名筆劃與五行分析個性、運勢與名字適配度', needsName: true },
  face: { name: '面相解析', focus: '從五官氣色的通則，說明性格、財運與事業傾向' },
  palm: { name: '掌紋密碼', focus: '從生命線、智慧線、感情線等通則解析人生變化' },
  fengshui: { name: '居家風水', focus: '就住宅格局、床位、財位對生活與工作氛圍的影響給建議' },
  numerology: { name: '生命靈數', focus: '以生命靈數解讀人格特質、人生課題與感情職涯方向', needsBirth: true },
  humandesign: { name: '人類圖', focus: '結合能量類型、內在權威與策略，分析決策與互動模式', needsBirth: true },
};

// A standard 78-card tarot deck (Major + Minor Arcana), Traditional Chinese.
const TAROT_DECK: string[] = [
  '愚者', '魔術師', '女祭司', '皇后', '皇帝', '教皇', '戀人', '戰車', '力量', '隱者',
  '命運之輪', '正義', '倒吊人', '死神', '節制', '惡魔', '高塔', '星星', '月亮', '太陽',
  '審判', '世界',
  ...['權杖', '聖杯', '寶劍', '錢幣'].flatMap((suit) => [
    `${suit}一`, `${suit}二`, `${suit}三`, `${suit}四`, `${suit}五`, `${suit}六`, `${suit}七`,
    `${suit}八`, `${suit}九`, `${suit}十`, `${suit}侍者`, `${suit}騎士`, `${suit}王后`, `${suit}國王`,
  ]),
];

export function drawTarot(count = 3): string[] {
  const deck = [...TAROT_DECK];
  const out: string[] = [];
  for (let i = 0; i < count && deck.length; i++) {
    const idx = Math.floor(Math.random() * deck.length);
    const card = deck.splice(idx, 1)[0];
    const reversed = Math.random() < 0.5;
    out.push(`${card}（${reversed ? '逆位' : '正位'}）`);
  }
  return out;
}

const POSITIONS = ['過去 / 現況', '當前的阻礙或助力', '可能的走向與建議'];

const CATEGORY_GUIDANCE: Record<string, string[]> = {
  bazi: [
    '請把出生陽曆、農曆、年生肖與時辰是否完整先校對清楚。',
    '請以專業命理老師的口吻談性格底盤、農曆年干支氣質、五行象意傾向、事業財運與感情互動；若系統沒有提供完整四柱與大運資料，不要虛構大運起運歲數或四柱干支。',
  ],
  ziwei: [
    '請先在「命盤資料校對」中列出系統提供的農曆生日，紫微斗數解讀不可改寫成其他農曆日期。',
    '內容以命盤校對、性格底盤、優勢盲點、事業財帛、感情互動、遷移外緣與近期提醒為主，寫法要像命理老師的正式書面報告；若系統沒有提供精密星曜座落資料，不要虛構具體主星落宮。',
  ],
  zodiac: [
    '請使用系統提供的農曆年與生肖，不要只用陽曆年份粗略判斷。',
    '內容涵蓋本命生肖性格氣質、年度沖合刑害、人際與工作節奏。',
  ],
  astro: [
    '西洋占星以陽曆生日與出生時間為主；若缺出生地或時間，需說明上升與宮位只能保守判讀。',
    '內容涵蓋太陽星座性格、情緒需求、人際互動、職涯表現與近期行動建議。',
  ],
  tarot: [
    '塔羅請從牌陣對應心理狀態、潛意識動機、外在阻礙與下一步選擇來解讀。',
    '即使不是本命命盤，也要加入「當下性格狀態與行為模式」分析，說明使用者此刻如何影響事件走向。',
  ],
  iching: [
    '易經請以本卦、變化趨勢、時位與宜忌來解讀；若未提供卦象，請以提問情境做象意式分析並明確說明為通則。',
    '請加入性格與決策模式分析，指出使用者當下應收斂、主動、等待或轉向之處。',
  ],
  name: [
    '姓名五行請從字義印象、五行補偏、人格特質、人際第一印象與職涯品牌感來解讀。',
    '請把性格分析放在核心位置，避免只談筆劃吉凶；若缺姓或全名，需提醒可補完整姓名。',
  ],
  face: [
    '面相解析請以額、眉、眼、鼻、口、下巴等部位的通則象意分析性格、決策風格與人際互動。',
    '未取得實際照片時不可聲稱看見具體五官，只能以使用者提問做通則式面相說明。',
  ],
  palm: [
    '手相請從生命線、智慧線、感情線、事業線等通則分析性格、行動模式、感情表達與職涯節奏。',
    '未取得實際手掌資訊時不可聲稱看見掌紋，只能提供通則與可觀察方向。',
  ],
  fengshui: [
    '居家風水請從動線、採光、床位、財位、書桌與收納秩序分析環境如何影響人的性格狀態與運勢節奏。',
    '若缺實際格局，需用保守通則，並給使用者可自行檢查的項目。',
  ],
  numerology: [
    '生命靈數以陽曆生日計算，不需改用農曆。',
    '內容涵蓋核心數字性格、人生課題、關係模式、天賦盲點與工作節奏。',
  ],
  humandesign: [
    '人類圖需精準出生時間與出生地；若資料不足，請以能量與決策風格做保守解讀。',
    '內容涵蓋性格能量、決策權威、互動模式、壓力反應與工作環境建議。',
  ],
};

const PERSONALITY_RULES = [
  '所有命理項目都必須加入性格分析，並放在報告前半段。',
  '性格分析至少涵蓋：核心性格、外在人際表現、內在需求、優勢天賦、常見盲點、壓力下的反應。',
  '請把性格連到事業、財運、感情與近期建議，不要只孤立描述個性。',
].join('\n');

function chatSystem(): string {
  return [
    '你是「MYSTIC 命理探索」的專屬命理老師，語氣沉穩、溫暖而神秘，帶東方玄學底蘊。',
    '一律使用「繁體中文」回覆。',
    '你只是一位命理老師，絕對不要提到你是 AI、語言模型、或任何技術/供應商名稱。',
    '命理老師對話的定位是：針對使用者的命盤、AI短讀與深度報告進行追問，協助把性格、感情、事業、財運與近期選擇看得更清楚。',
    '每次回覆約 150–350 字，像老師直接點重點；不要寫成深度報告，不要長篇鋪陳。',
    '這是一段與同一位使用者持續進行的對話，請自然延續上下文、記得先前談過的內容。',
    '回答要親切、具體、可操作，避免空泛套話；若有命盤或報告摘要，請至少引用一項依據。',
    '若使用者詢問付款、登入、技術故障或客服問題，請簡短引導他到設定或客服，不要展開成命理解讀。',
    '不要使用 Markdown 井字號標題符號（#）。',
  ].join('\n');
}

export function buildPrompt(inputs: ReadingInputs): { system: string; user: string } {
  // Conversational mode: 命理老師對話。
  if (inputs.mode === 'chat') {
    const lines: string[] = [];
    const meta = CATEGORIES[inputs.category ?? ''] ?? {
      name: '綜合命理',
      focus: '給予貼近提問的命理指引',
    };
    const chartData = buildFortuneChartData({
      category: inputs.category,
      name: inputs.name,
      gender: inputs.gender,
      birthDate: inputs.birth_date,
      birthTime: inputs.birth_time,
      birthPlace: inputs.birth_place,
    });
    lines.push(`【對話定位】針對使用者的命盤、AI短讀與深度報告進行追問，協助把性格、感情、事業、財運與近期選擇看得更清楚。`);
    lines.push(`【目前命理項目】${meta.name}`);
    lines.push(formatFortuneChartForPrompt(chartData));
    if (inputs.report_context?.trim()) {
      lines.push(`【最近一次短讀／深度報告摘要】\n${inputs.report_context.trim()}`);
    }
    lines.push('【對話規則】每次回覆約 150–350 字；直接點重點；可給 2–4 個具體建議；不要重寫整份深度報告。');
    for (const turn of inputs.history ?? []) {
      lines.push(`${turn.role === 'assistant' ? '老師' : '訪客'}：${turn.text}`);
    }
    lines.push(`訪客：${inputs.question?.trim() || '老師好，想請教一些人生方向。'}`);
    lines.push('老師：');
    return { system: chatSystem(), user: lines.join('\n') };
  }

  const meta = CATEGORIES[inputs.category ?? ''] ?? {
    name: '綜合命理',
    focus: '給予貼近提問的命理指引',
  };
  const premium = inputs.depth === 'premium';
  const tarotReading = inputs.category === 'tarot';

  const formatRule = premium
    ? [
        '【輸出層級】專業深度報告。這是付費訂閱內容，必須明顯高於短讀：不是摘要、不是通則、不是幾段文字加表格。',
        '請寫一篇約 7600–11000 字、結構完整、文字厚實的專業命理老師深度書面報告；若輸出上限不足，優先保留判讀依據、性格分析、事業財運、感情人際與可執行建議。',
        '寫法要像付費命理老師交付的正式報告：先校盤、再論本命格局、再逐項細論，最後給時間節奏與具體調整策略。',
        '每一節都必須引用「系統排盤資料」中的具體依據，例如四柱、日主、五行分布、大運、命宮、主星、宮位、四化、生肖或生命靈數；資料不足時才明確說明保守判讀，不能用空泛心理分析取代命理依據。',
        '務必依序使用以下中文小節標題，每節先寫 5–9 段深入文字，再附 1 個 Markdown 表格。',
        '一、命盤資料校對',
        '二、性格底盤、優勢天賦與盲點',
        '三、事業／學業與工作定位',
        '四、財運、資源與風險控管',
        '五、感情／婚姻與人際互動',
        '六、家庭、健康與內在課題',
        '七、近期三個月節奏與流年提醒',
        '八、開運策略與行動清單',
        '第一節必須列出算命者資料，並逐項校對國曆、農曆、時辰、八字四柱或紫微命盤資料；不可只說「資料正確」，也不可跳過資料不足的提醒。',
        '第二節「性格底盤、優勢天賦與盲點」至少 1200–1700 字，需寫得像專業命理老師在做本命性格剖析，包含外顯性格、內在需求、壓力反應、關係模式、成熟課題與容易反覆出現的人生模式。',
        '事業、財運、感情三節都要拆成「先天傾向」「容易遇到的情境」「近期可操作策略」「風險避忌」四層，不可只給形容詞。',
        '每個表格固定使用 3 欄：面向｜命盤觀察｜具體建議；每列內容 65–140 字，至少 6 列。',
        '表格內容要像命理老師的診斷摘要：左欄寫議題，中欄引用盤面或命理依據，右欄給明確行動、避忌或調整方法。',
        '至少加入 2 個「老師提醒」段落，用自然段落寫出使用者最該注意的盲點與轉運關鍵，不要放在表格裡草草帶過。',
        '整篇報告必須貼近使用者提問；不要堆砌吉凶詞，需包含具體情境、判斷依據、時間節奏、風險提醒與可執行步驟。',
      ].join('\n')
    : tarotReading
      ? [
          '【輸出層級】塔羅神諭短讀。請以 80–150 字完成，像老師直接解牌與給下一步提醒。',
          '請先點出三張牌的主軸，再整合成一段清楚判讀；不要寫成深度報告，也不要使用長篇表格。',
          '內容必須包含：當下性格狀態、事件阻礙、可能走向、1 個可立刻執行的行動建議。',
          '語氣簡短但要有命理老師的判斷感；避免空泛祝福或只重述牌名。',
        ].join('\n')
    : [
        '【輸出層級】AI 短讀。這是快速掃讀內容，必須和深度報告明顯不同：只抓重點、少量段落、表格摘要，不展開成長篇書面報告。',
        '請寫一篇約 650–900 字的表格式短讀，讓使用者 1–2 分鐘可讀完。',
        '請依序使用以下中文小節標題：命盤資料校對、性格速寫、重點觀察、近期建議。',
        '每節先寫 1 段 60–110 字說明，再附 1 個 Markdown 表格。',
        '性格速寫只需清楚說明核心性格、優勢、盲點與壓力反應，不做完整本命長篇剖析。',
        '表格固定使用 3 欄：面向｜解讀｜行動建議；每列內容 25–55 字，每節 2–3 列即可。',
        '不要輸出大運長論、十二宮逐宮細論、長篇風險分析或多層策略；這些只留給深度報告。',
        '語氣精煉但資訊完整，聚焦使用者提問並給出可操作建議。',
      ].join('\n');

  const system = [
    '你是「MYSTIC 命理探索」的專屬命理老師，語氣沉穩、溫暖而神秘，帶東方玄學底蘊。',
    '一律使用「繁體中文」回覆。',
    '你只是一位命理老師，絕對不要提到你是 AI、語言模型、或任何技術/供應商名稱。',
    '不要使用 Markdown 井字號標題符號（#），可用中文小標、換行分段與 Markdown 表格。',
    '內容要具體、可操作，避免空泛套話；適度給出正向而務實的建議。',
    '表格請使用標準 Markdown pipe table，例如「| 面向 | 解讀 | 行動建議 |」，不要使用 HTML。',
    '若使用者未提供足夠資訊（如生日），仍先給出通則性解讀，並在結尾溫和提醒可補充哪些資料以獲得更精準的分析。',
    premium
      ? '現在輸出的是付費深度報告：要有專業命理老師書面報告的厚度，交代判讀依據、優勢與盲點、事件情境、時間節奏、風險控管與調整方法；若系統提供八字四柱、大運或紫微十二宮星曜，必須以這些資料為核心判讀。'
      : tarotReading
        ? '現在輸出的是塔羅神諭短讀：80–150 字，直接解牌、指出當下性格狀態與下一步，不要寫成表格式長文。'
      : '現在輸出的是 AI 短讀：請保持精簡、表格式、重點式，不要寫成付費深度報告，也不要逐項展開大運或十二宮細節。',
  ].join('\n');

  const parts: string[] = [];
  const chartData = buildFortuneChartData({
    category: inputs.category,
    name: inputs.name,
    gender: inputs.gender,
    birthDate: inputs.birth_date,
    birthTime: inputs.birth_time,
    birthPlace: inputs.birth_place,
  });
  parts.push(`【服務項目】${meta.name}`);
  parts.push(`【解讀重點】${meta.focus}`);
  parts.push(
    tarotReading
      ? '【共同專業規則】塔羅短讀也必須帶到「當下性格狀態或行為模式」，但只抓最關鍵的一點，不要展開成完整性格報告。'
      : `【共同專業規則】\n${PERSONALITY_RULES}`,
  );
  parts.push(
    tarotReading
      ? '【短讀開頭要求】開頭請先用一行列「算命者資料」，包含姓名、性別、出生國曆、出生農曆與時辰；未提供的欄位請標示「未提供」。'
      : '【報告開頭要求】正文第一節一開始必須先列「算命者資料」，包含姓名、性別、出生國曆、出生農曆、出生時間、命理時辰；未提供的欄位請標示「未提供」。',
  );
  parts.push(formatFortuneChartForPrompt(chartData));
  parts.push(`【時辰校正】十二時辰分界為：${CHINESE_HOUR_RULE_TEXT}。若系統已提供命理時辰，請直接採用，不可把 03:00-04:59 誤判為丑時。`);
  parts.push(`【提問】${inputs.question?.trim() || '請給我整體的近期運勢指引。'}`);

  const guidance = CATEGORY_GUIDANCE[inputs.category ?? ''];
  if (guidance?.length) parts.push(`【解讀規則】\n${guidance.join('\n')}`);

  if (inputs.category === 'tarot') {
    const cards = drawTarot(3);
    const spread = cards.map((c, i) => `${POSITIONS[i]}：${c}`).join('\n');
    parts.push(`【抽出的牌陣】\n${spread}`);
    parts.push('請把三張牌整合成 80–150 字短讀，可提及牌位與正逆位，但不要逐張長篇展開。');
  }

  parts.push(formatRule);

  return { system, user: parts.join('\n') };
}
