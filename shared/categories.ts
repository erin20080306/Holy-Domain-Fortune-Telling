// The 12 命理 categories. Product-facing names only.
export interface FortuneCategory {
  id: string;
  name: string;
  subtitle: string; // 英文副標
  desc: string;
  icon: string; // lucide-react icon name
}

export const FORTUNE_CATEGORIES: FortuneCategory[] = [
  { id: 'bazi', name: '八字流年', subtitle: '四柱 BAZI DESTINY', desc: '排年月日時柱，看個性、工作、財運、感情與大運', icon: 'CalendarDays' },
  { id: 'ziwei', name: '紫微斗數', subtitle: '紫微 PURPLE STAR', desc: '排命盤看十二宮，分析人生方向、事業與感情細節', icon: 'Sparkles' },
  { id: 'zodiac', name: '生肖太歲', subtitle: '生肖 ZODIAC YEAR', desc: '依出生生肖看每年的沖合刑害，掌握年度運勢方向', icon: 'Orbit' },
  { id: 'astro', name: '星盤占星', subtitle: '占星 ASTROLOGY', desc: '計算日月升與行星位置，看性格、人際與近期行運', icon: 'MoonStar' },
  { id: 'tarot', name: '塔羅神諭', subtitle: '塔羅 TAROT CARDS', desc: '抽牌解讀目前狀況與可能走向，適合問具體的問題', icon: 'GalleryVerticalEnd' },
  { id: 'iching', name: '易經占卜', subtitle: '易經 I CHING', desc: '透過卦象判斷事情的變化與趨勢，解答當下疑惑', icon: 'Hexagon' },
  { id: 'name', name: '姓名五行', subtitle: '姓名 NAME ANALYSIS', desc: '依筆劃、五行分析個性、運勢與名字適合度', icon: 'Type' },
  { id: 'face', name: '面相解析', subtitle: '面相 FACE READING', desc: '看額眉眼鼻嘴顎等，判斷性格、財運與事業', icon: 'Smile' },
  { id: 'palm', name: '掌紋密碼', subtitle: '手相 PALMISTRY', desc: '看生命、智慧、感情等線條，解析人生變化', icon: 'Hand' },
  { id: 'fengshui', name: '居家風水', subtitle: '風水 FENG SHUI', desc: '看住宅、床位、財位對生活與工作氛圍的影響', icon: 'Home' },
  { id: 'numerology', name: '生命靈數', subtitle: '靈數 NUMEROLOGY', desc: '解讀人格特質、人生課題、感情與職涯方向', icon: 'Binary' },
  { id: 'humandesign', name: '人類圖', subtitle: '人類圖 HUMAN DESIGN', desc: '結合多種系統，分析能量類型、決策與互動模式', icon: 'Fingerprint' },
];
