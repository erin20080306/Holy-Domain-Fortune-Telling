// Product-facing copy. The frontend must ONLY ever show these names.
// Model / provider / token / API technical names are strictly forbidden here.

export const PRODUCT_NAMES = {
  shortReading: '命理短解讀',
  dailyGuidance: '今日指引',
  premiumAnalysis: '司夜深度分析',
  premiumReport: '3,000 字完整命理報告',
  premiumChat: '命理老師',
  premiumChatAlt: '司夜進階對話',
  bazi: '八字排盤服務',
  ziwei: '紫微命盤',
} as const;

// User-friendly messages. NEVER surface provider / model / webhook / stack traces.
export const USER_MESSAGES = {
  analysisBusy: '分析服務暫時忙碌，請稍後再試。',
  paymentConfirming: '付款狀態確認中，請稍後重新整理。',
  quotaExhausted: '目前額度已用完，請下個月再使用或升級方案。',

  // Payment lifecycle copy
  paymentPending:
    '我們正在確認你的付款狀態，通常需要數分鐘。若等待較久，請聯絡客服協助確認。',
  paymentActivated: '你的方案已啟用，現在可以使用深度命理報告。',
  paymentFailed: '付款尚未完成，請重新確認付款狀態。',
  planExpired: '你的方案已到期，目前已切換為免費方案。',

  // Generic
  genericError: '目前服務暫時無法使用，請稍後再試。',
  loginRequired: '請先登入以使用此功能。',
  planRequired: '此功能需要訂閱方案才能使用。',
  offline:
    '目前沒有網路連線，已載入離線模式。登入、付款、深度分析與資料同步需恢復網路後使用。',
} as const;
