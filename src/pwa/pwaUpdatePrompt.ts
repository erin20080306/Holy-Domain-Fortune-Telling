// Copy + tiny state holder for the "new version available" prompt. The actual
// SW update trigger comes from registerServiceWorker()'s returned function.
export const UPDATE_COPY = {
  title: '發現新版本',
  body: '重新整理後即可使用最新功能。',
  button: '立即更新',
} as const;

export const OFFLINE_READY_COPY = {
  title: '離線模式已就緒',
  body: '基本內容已可離線瀏覽。',
} as const;
