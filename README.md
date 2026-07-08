# MYSTIC 命理探索

深色神秘風格命理 App：塔羅、八字、紫微、星座與 AI 命理老師。Vite + React + TypeScript SPA、Vercel Functions 後端、Supabase、PWA。

## 特色
- MYSTIC 深黑金色 UI（#050508 / #A89882），手機優先，支援 safe area。
- 正式 Supabase Auth 登入 / 註冊（無假登入、無硬編碼 admin）。
- 方案與額度全部由後端以 `user_id` 為準，跨裝置不重算。
- PayPal 訂閱（NT$99 / NT$299）— 點擊不直接開通，需 webhook 或管理員匹配。
- 管理員後台：註冊者列表（分頁 / 搜尋 / 篩選）、修改方案、audit log。
- 前台永不顯示模型 / provider 名稱。
- PWA：可安裝、離線頁、低效能模式、iOS 加入主畫面教學。

## 快速開始
```bash
npm install
cp .env.example .env.local   # 填入你的值（勿提交）
npm run dev
```

## 指令
| 指令 | 說明 |
|---|---|
| `npm run dev` | 開發伺服器 |
| `npm run build` | 產生 `dist/` + service worker |
| `npm run lint` / `typecheck` / `test` | 驗證 |
| `npm run check:secrets` / `check:client-env` | 安全檢查 |
| `npm run generate:pwa-assets` | 產生 PWA icon（純 Node） |

部署見 [`README_DEPLOY_VERCEL.md`](./README_DEPLOY_VERCEL.md)。

## 目錄
- `src/` 前端（screens / components / pwa / lib / state）
- `api/` Vercel Functions（`_lib` 服務層、paypal、me、admin、fortune）
- `shared/` 前後端共用純邏輯（plans / entitlement / productCopy / paypalVisibility）
- `supabase/migrations/` 資料表 + RLS + RPC
- `scripts/` 安全檢查與 PWA 資產產生
