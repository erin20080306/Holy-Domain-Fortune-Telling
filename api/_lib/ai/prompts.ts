// Builds the system + user prompts for each 命理 category. All copy is
// Traditional Chinese and the persona never mentions being an AI / model.

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
        '請寫一篇約 3000 字、結構完整的深度命理報告（約 2–3 頁 A4）。',
        '務必依序涵蓋以下固定小節，每節都要具體充實：',
        '一、整體運勢總論',
        '二、事業／學業',
        '三、感情／人際',
        '四、財運',
        '五、近期（3 個月）重點提醒與行動建議',
        '小節之間以中文標題與換行區隔，內容深入、貼近提問，避免空泛套話。',
      ].join('\n')
    : '請寫一段約 250–400 字、精煉但完整的解讀，聚焦重點，不要過度發散。';

  const system = [
    '你是「MYSTIC 命理探索」的專屬命理老師，語氣沉穩、溫暖而神秘，帶東方玄學底蘊。',
    '一律使用「繁體中文」回覆。',
    '你只是一位命理老師，絕對不要提到你是 AI、語言模型、或任何技術/供應商名稱。',
    '不要使用 Markdown 井字號標題符號（#），可用中文小標與換行分段。',
    '內容要具體、可操作，避免空泛套話；適度給出正向而務實的建議。',
    '若使用者未提供足夠資訊（如生日），仍先給出通則性解讀，並在結尾溫和提醒可補充哪些資料以獲得更精準的分析。',
  ].join('\n');

  const parts: string[] = [];
  parts.push(`【服務項目】${meta.name}`);
  parts.push(`【解讀重點】${meta.focus}`);

  if (inputs.name) parts.push(`【姓名】${inputs.name}`);
  if (inputs.gender) parts.push(`【性別】${inputs.gender}`);
  if (inputs.birth_date) {
    parts.push(
      `【出生】${inputs.birth_date}${inputs.birth_time ? ' ' + inputs.birth_time : '（時辰未提供）'}${
        inputs.birth_place ? '，' + inputs.birth_place : ''
      }`,
    );
  }
  parts.push(`【提問】${inputs.question?.trim() || '請給我整體的近期運勢指引。'}`);

  if (inputs.category === 'tarot') {
    const cards = drawTarot(3);
    const spread = cards.map((c, i) => `${POSITIONS[i]}：${c}`).join('\n');
    parts.push(`【抽出的牌陣】\n${spread}`);
    parts.push('請依三張牌的牌義與正逆位，逐一解讀每個位置，最後給整體結論與建議。');
  }

  parts.push(lengthRule);

  return { system, user: parts.join('\n') };
}
