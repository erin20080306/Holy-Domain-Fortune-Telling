// Builds the system + user prompts for each 命理 category. All copy is
// Traditional Chinese and the persona never mentions being an AI / model.

import { formatLunarDateForPrompt } from '../../../shared/lunarCalendar.js';

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
  bazi: { name: '八字流年', focus: '以年月日時四柱推算個性、事業、財運、感情與近年大運走勢', needsBirth: true },
  ziwei: { name: '紫微斗數', focus: '以命盤十二宮分析人生方向、事業、感情與財帛等細節', needsBirth: true },
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
    '請以專業命理老師的口吻談性格底盤、年柱氣質、五行傾向、事業財運與感情互動；若沒有完整精密排盤資料，不要虛構大運起運歲數或四柱干支。',
  ],
  ziwei: [
    '請先在「命盤資料校對」中列出系統提供的農曆生日，紫微斗數解讀不可改寫成其他農曆日期。',
    '內容以命宮性格、優勢盲點、事業宮、財帛宮、夫妻宮、遷移宮與近期提醒為主，寫法要像命理老師的正式書面報告；若沒有精密星曜座落資料，不要虛構具體主星落宮。',
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
    '這是一段與同一位使用者持續進行的對話，請自然延續上下文、記得先前談過的內容。',
    '回覆長度適中（約 150–350 字），親切、具體、可操作，避免空泛套話。',
    '不要使用 Markdown 井字號標題符號（#）。',
  ].join('\n');
}

export function buildPrompt(inputs: ReadingInputs): { system: string; user: string } {
  // Conversational mode: 命理老師對話。
  if (inputs.mode === 'chat') {
    const lines: string[] = [];
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

  const lengthRule = premium
    ? [
        '請寫一篇約 5200–7800 字、結構完整、文字充實的專業命理老師深度書面報告。',
        '寫法要像付費命理老師交付的正式報告：先校盤、再論格局、分項細論、最後給實際調整建議。',
        '務必依序使用以下中文小節標題，每節先寫 4–7 段深入文字，再附 1 個 Markdown 表格。',
        '一、命盤資料校對',
        '二、性格底盤、優勢天賦與盲點',
        '三、事業／學業與工作定位',
        '四、財運、資源與風險控管',
        '五、感情／婚姻與人際互動',
        '六、家庭、健康與內在課題',
        '七、近期三個月節奏與流年提醒',
        '八、開運策略與行動清單',
        '第二節「性格底盤、優勢天賦與盲點」至少 700–1000 字，需寫得像專業命理老師在做本命性格分析。',
        '每個表格固定使用 3 欄：面向｜命盤觀察｜具體建議；每列內容 45–100 字，至少 4 列。',
        '每節都要貼近使用者提問；不要只寫抽象形容詞，需包含具體情境、判斷依據與可執行提醒。',
      ].join('\n')
    : [
        '請寫一篇約 900–1200 字的表格式短讀，內容要比一般短答更豐富，但仍方便快速掃讀。',
        '請依序使用以下中文小節標題：命盤資料校對、性格分析、核心觀察、事業與財運、感情與人際、近期建議。',
        '每節先寫 1 段 80–140 字說明，再附 1 個 Markdown 表格。',
        '性格分析必須清楚說明核心性格、優勢、盲點與壓力反應。',
        '表格固定使用 3 欄：面向｜解讀｜行動建議；每列內容 25–60 字，至少 2 列。',
        '語氣精煉但資訊完整，聚焦使用者提問並給出可操作建議。',
      ].join('\n');

  const system = [
    '你是「MYSTIC 命理探索」的專屬命理老師，語氣沉穩、溫暖而神秘，帶東方玄學底蘊。',
    '一律使用「繁體中文」回覆。',
    '你只是一位命理老師，絕對不要提到你是 AI、語言模型、或任何技術/供應商名稱。',
    '不要使用 Markdown 井字號標題符號（#），可用中文小標、換行分段與 Markdown 表格。',
    '深度報告要有專業命理老師書面報告的厚度：交代判讀依據、優勢與盲點、事件情境、時間節奏與調整方法。',
    '內容要具體、可操作，避免空泛套話；適度給出正向而務實的建議。',
    '表格請使用標準 Markdown pipe table，例如「| 面向 | 解讀 | 行動建議 |」，不要使用 HTML。',
    '若使用者未提供足夠資訊（如生日），仍先給出通則性解讀，並在結尾溫和提醒可補充哪些資料以獲得更精準的分析。',
  ].join('\n');

  const parts: string[] = [];
  parts.push(`【服務項目】${meta.name}`);
  parts.push(`【解讀重點】${meta.focus}`);
  parts.push(`【共同專業規則】\n${PERSONALITY_RULES}`);
  parts.push('【報告開頭要求】正文第一節一開始必須先列「算命者資料」，包含姓名、性別、出生國曆、出生農曆、出生時間；未提供的欄位請標示「未提供」。');

  if (inputs.name) parts.push(`【姓名】${inputs.name}`);
  if (inputs.gender) parts.push(`【性別】${inputs.gender}`);
  if (inputs.birth_date) {
    parts.push(
      `【算命者出生國曆】${inputs.birth_date}${inputs.birth_time ? ' ' + inputs.birth_time : '（時辰未提供）'}${
        inputs.birth_place ? '，' + inputs.birth_place : ''
      }`,
    );
    const lunarDate = formatLunarDateForPrompt(inputs.birth_date);
    if (lunarDate) {
      parts.push(`【算命者出生農曆】${lunarDate}`);
      parts.push('【曆法校正】出生農曆由系統換算，請直接採用；不可自行重算成其他農曆月份或日期。');
    }
  }
  parts.push(`【提問】${inputs.question?.trim() || '請給我整體的近期運勢指引。'}`);

  const guidance = CATEGORY_GUIDANCE[inputs.category ?? ''];
  if (guidance?.length) parts.push(`【解讀規則】\n${guidance.join('\n')}`);

  if (inputs.category === 'tarot') {
    const cards = drawTarot(3);
    const spread = cards.map((c, i) => `${POSITIONS[i]}：${c}`).join('\n');
    parts.push(`【抽出的牌陣】\n${spread}`);
    parts.push('請依三張牌的牌義與正逆位，逐一解讀每個位置，最後給整體結論與建議。');
  }

  parts.push(lengthRule);

  return { system, user: parts.join('\n') };
}
