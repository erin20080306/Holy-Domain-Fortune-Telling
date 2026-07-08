// The original 12 命理 categories. Product-facing names only.
export interface FortuneCategory {
  id: string;
  name: string;
  desc: string;
  icon: string; // lucide-react icon name
}

export const FORTUNE_CATEGORIES: FortuneCategory[] = [
  { id: 'tarot', name: '每日塔羅', desc: '抽一張牌，聆聽今日指引', icon: 'Sparkles' },
  { id: 'zodiac', name: '星座運勢', desc: '十二星座每日能量', icon: 'Star' },
  { id: 'chinese_zodiac', name: '生肖運勢', desc: '十二生肖流年走向', icon: 'Rabbit' },
  { id: 'numerology', name: '生命靈數', desc: '從生日解讀天賦', icon: 'Hash' },
  { id: 'bazi', name: '八字排盤', desc: '天干地支命盤解析', icon: 'Grid3x3' },
  { id: 'ziwei', name: '紫微命盤', desc: '紫微斗數十二宮', icon: 'Orbit' },
  { id: 'love', name: '感情合盤', desc: '兩人緣分能量對照', icon: 'Heart' },
  { id: 'career', name: '事業運勢', desc: '職涯方向與時機', icon: 'Briefcase' },
  { id: 'wealth', name: '財富流向', desc: '財運節奏與提醒', icon: 'Coins' },
  { id: 'name', name: '姓名學', desc: '筆畫與五行分析', icon: 'PenLine' },
  { id: 'dream', name: '解夢占卜', desc: '夢境象徵解讀', icon: 'Moon' },
  { id: 'yearly', name: '流年運程', desc: '整年運勢總覽', icon: 'CalendarRange' },
];
