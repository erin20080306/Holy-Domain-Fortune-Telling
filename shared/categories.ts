// The 12 命理 categories. Product-facing names only.
export interface FortuneCategory {
  id: string;
  name: string;
  subtitle: string; // 英文副標
  desc: string;
  icon: string; // lucide-react icon name
  calculationLevel: 'engine' | 'draw' | 'guided';
  calculationLabel: '系統排盤' | '系統抽牌' | '通則指引';
  supportsDeepReport: boolean;
}

export const FORTUNE_CATEGORIES: FortuneCategory[] = [
  { id: 'bazi', name: '八字流年', subtitle: '四柱 BAZI DESTINY', desc: '由排盤引擎計算四柱、十神、五行與大運，再進行命理解讀', icon: 'CalendarDays', calculationLevel: 'engine', calculationLabel: '系統排盤', supportsDeepReport: true },
  { id: 'ziwei', name: '紫微斗數', subtitle: '紫微 PURPLE STAR', desc: '由排盤引擎計算十二宮、主輔星、四化與大限，再進行命理解讀', icon: 'Sparkles', calculationLevel: 'engine', calculationLabel: '系統排盤', supportsDeepReport: true },
  { id: 'zodiac', name: '生肖太歲', subtitle: '生肖 ZODIAC YEAR', desc: '由農曆換算生肖與干支，再分析年度沖合刑害與行動方向', icon: 'Orbit', calculationLevel: 'engine', calculationLabel: '系統排盤', supportsDeepReport: true },
  { id: 'astro', name: '星盤占星', subtitle: '占星 ASTROLOGY', desc: '目前提供出生資料與太陽星座通則指引，尚未排出完整行星與宮位', icon: 'MoonStar', calculationLevel: 'guided', calculationLabel: '通則指引', supportsDeepReport: false },
  { id: 'tarot', name: '塔羅神諭', subtitle: '塔羅 TAROT CARDS', desc: '由系統抽取三張牌與正逆位，解讀目前狀況、阻礙與可能走向', icon: 'GalleryVerticalEnd', calculationLevel: 'draw', calculationLabel: '系統抽牌', supportsDeepReport: false },
  { id: 'iching', name: '易經占卜', subtitle: '易經 I CHING', desc: '目前依具體提問提供易經象意通則，尚未啟用正式起卦引擎', icon: 'Hexagon', calculationLevel: 'guided', calculationLabel: '通則指引', supportsDeepReport: false },
  { id: 'name', name: '姓名五行', subtitle: '姓名 NAME ANALYSIS', desc: '目前依姓名字義與五行象意提供指引，尚未啟用康熙筆畫引擎', icon: 'Type', calculationLevel: 'guided', calculationLabel: '通則指引', supportsDeepReport: false },
  { id: 'face', name: '面相解析', subtitle: '面相 FACE READING', desc: '目前依你描述的五官特徵提供通則，尚未支援照片面相辨識', icon: 'Smile', calculationLevel: 'guided', calculationLabel: '通則指引', supportsDeepReport: false },
  { id: 'palm', name: '掌紋密碼', subtitle: '手相 PALMISTRY', desc: '目前依你描述的掌紋特徵提供通則，尚未支援手掌照片辨識', icon: 'Hand', calculationLevel: 'guided', calculationLabel: '通則指引', supportsDeepReport: false },
  { id: 'fengshui', name: '居家風水', subtitle: '風水 FENG SHUI', desc: '目前依你描述的格局、坐向與房間用途提供通則調整建議', icon: 'Home', calculationLevel: 'guided', calculationLabel: '通則指引', supportsDeepReport: false },
  { id: 'numerology', name: '生命靈數', subtitle: '靈數 NUMEROLOGY', desc: '由陽曆生日計算核心數字與化約過程，再解讀性格與人生課題', icon: 'Binary', calculationLevel: 'engine', calculationLabel: '系統排盤', supportsDeepReport: true },
  { id: 'humandesign', name: '人類圖', subtitle: '人類圖 HUMAN DESIGN', desc: '目前提供能量與決策風格通則，尚未排出類型、權威、通道與閘門', icon: 'Fingerprint', calculationLevel: 'guided', calculationLabel: '通則指引', supportsDeepReport: false },
];

export function getFortuneCategory(categoryId: string | undefined): FortuneCategory | undefined {
  return FORTUNE_CATEGORIES.find((category) => category.id === categoryId);
}
