# MYSTIC 命理探索 — Vercel 部署指南

專案類型：**Vite + React + TypeScript SPA + Vercel Functions (`/api`) + Supabase + PWA**

---

## 1. GitHub push 步驟

```bash
git checkout feat/vercel-pwa-paypal-admin-subscription
git add -A
git commit -m "feat: add Vercel PWA PayPal subscriptions and admin backend"
git push origin feat/vercel-pwa-paypal-admin-subscription
```

> 目前分支已完成 commit，未自動 push。請自行 push（需你的 GitHub 認證）。

## 2. Vercel import GitHub repo

1. Vercel → Add New → Project → Import `Holy-Domain-Fortune-Telling`。
2. Framework Preset：**Vite**。
3. Build Command：`npm run build`
4. Output Directory：`dist`
5. Install Command：`npm ci`

`vercel.json` 已設定 SPA fallback（排除 `/api`）與 manifest / sw.js header。

## 3. 環境變數（Vercel → Settings → Environment Variables）

### Production
| Key | 說明 |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 前端公開 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | 後端專用（勿放前端） |
| `ANTHROPIC_API_KEY` / `CLAUDE_MODEL_PREMIUM` | 後端專用 |
| `GEMINI_API_KEY` / `GEMINI_MODEL_FREE` | 後端專用 |
| `FREE_ASTRO_API_KEY` | 後端專用 |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` | 後端專用 |
| `PAYPAL_ENV` | Production 設 `live` |
| `PAYPAL_PLAN_99_LINK` | `https://www.paypal.com/ncp/payment/WXRQLYEH8TSFJ` |
| `PAYPAL_PLAN_299_LINK` | `https://www.paypal.com/ncp/payment/NSQVJ9TZC3C88` |
| `VITE_PAYPAL_PLAN_99_LINK` / `VITE_PAYPAL_PLAN_299_LINK` | 前端顯示用（同上連結） |
| `ADMIN_EMAILS` | `erin20080306@gmail.com` |
| `ADMIN_DEBUG_AI_PROVIDER_VISIBLE` | 預設 `false` |
| `PAYPAL_CHECKOUT_ENABLED` / `VITE_PAYPAL_CHECKOUT_ENABLED` | 合規後再開 `true` |
| `WEB_ENABLE_PAYPAL_LINKS` / `VITE_WEB_ENABLE_PAYPAL_LINKS` | `true` |
| `IOS_HIDE_EXTERNAL_PAYPAL_LINKS` / `ANDROID_...` + `VITE_` 版本 | `true` |
| `PLAN_*_LIMIT` 系列 | 額度上限（見 `.env.example`） |

完整清單見 `.env.example`。

### Preview
- 使用 sandbox key、`PAYPAL_ENV=sandbox`、不開真實付費、不接 production webhook。

### Development
- 本地 `.env.local`（**不要提交**）。

## 4. Supabase 設定

1. 執行 migration：`supabase/migrations/0001_init_mystic.sql`、`0002_usage_rpc.sql`（Supabase SQL Editor 或 `supabase db push`）。
2. Auth → URL Configuration：
   - **Site URL**：`https://你的網域`
   - **Redirect URLs**：`https://你的網域/*`、`http://localhost:5173/*`

## 5. PayPal webhook URL

部署後於 PayPal Developer → Webhooks 新增：

```
https://你的網域/api/paypal/webhook
```

並將 Webhook ID 填入 `PAYPAL_WEBHOOK_ID`。

> ⚠️ 目前使用 PayPal NCP 固定付款連結，**無法自動帶 user_id / checkout_token**。
> 因此付款須靠 webhook 或**管理員手動匹配**，不能只靠前端點擊開通。
> 無法自動匹配的付款會進入 `paypal_payment_events.status = 'pending_match'`，
> 於後台「待人工確認付款」處理。

PayPal return / cancel（若 NCP 支援）：
```
https://你的網域/payment/return
https://你的網域/payment/cancel
```

## 6. PWA / Service Worker 檢查

- `public/manifest.webmanifest`：name/short_name/theme_color/icons。
- 產出 `dist/sw.js`（vite-plugin-pwa）。
- Service Worker 對 `/api`、`/auth`、`/admin`、`/payments`、`/paypal` 一律 **NetworkOnly**，永不快取私密資料。
- Dev 模式不強制註冊 SW。

## 7. 測試流程

### Lighthouse / PWA
1. Chrome DevTools → Lighthouse → Mobile → PWA。
2. Network throttling：Slow 4G。
3. DevTools → Application → Service Workers → Offline 勾選測離線頁。
4. iPhone Safari：分享 → 加入主畫面。
5. Android Chrome / Samsung Internet：安裝提示。
6. 安裝後以 standalone 開啟。
7. 部署新版本 → 應出現「發現新版本」→「立即更新」。
8. DevTools → Performance → CPU 4x/6x throttle 模擬舊機。

目標：Performance ≥ 80、Accessibility ≥ 90、Best Practices ≥ 90、PWA 主要項目通過。

### 確認前台不顯示模型名稱
- `npm run check:client-env`（build 後掃描 `dist/assets`，禁止 Claude/Gemini/model_name/provider）。
- `npm test`（`productCopy.test.ts` 驗證所有前台文案）。

### 確認 API key 不進 client bundle
- `npm run check:client-env`：src 不得引用 server-only env；`VITE_` 不得含 secret 字樣；bundle 不得含 secret。

### 舊手機測試清單
- iPhone 8 / SE2 / 舊 iPad：確認低效能模式（無大動畫 / blur）。
- Android 8+ 中低階機：首屏載入不卡、可安裝。
- 弱網 / 不穩 4G：離線頁正確顯示。
- prefers-reduced-motion：動畫關閉。

## 8. 本機驗證指令

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm run check:secrets
npm run check:client-env
npm run generate:pwa-assets   # 重新產生 icon（純 Node，無需 sharp）
```

## 9. Capacitor（未來 iOS / Android 打包）

- Web / PWA 由 Vercel 部署；App 由 Capacitor 打包，共用 UI。
- App 內 `PlansScreen` 依平台自動隱藏外部 PayPal 按鈕（iOS/Android 預設隱藏，顯示「訂閱功能準備中」）。
- API base 由 `VITE_API_BASE_URL` 指向 Vercel 網域。

## 10. 上線前尚需你完成

1. 於 Vercel 填入所有 Production 環境變數（真實 key）。
2. 於 PayPal 設定 webhook URL 並填 `PAYPAL_WEBHOOK_ID`。
3. 於 Supabase 執行 migration 並設定 Auth URL。
4. 以真實動漫人物圖替換 `src/assets/shiya.svg` 與 `public/screenshots/*`。
5. 確認合規後再開 `PAYPAL_CHECKOUT_ENABLED=true`。
6. 首次以 `ADMIN_EMAILS` 帳號登入 → 自動升級為 super_admin。
