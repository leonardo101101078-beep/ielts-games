# 📅 [2026-03-30] Vibe Coding Log

## 🌊 今日開發狀態： ★★★★☆（4/5）

流暢度高：資料模型、主流程、登入與模板管理已串起；中途在環境變數與 Next/PWA 建置型別上反覆較久，扣一星。

---

## 1. 🛠 核心進度與突破 (Core Progress)

**今日目標：**  
建立 DailyVibe PWA：Supabase 資料層、今日任務清單（含樂觀更新與進度條）、Magic Link 登入、任務模板管理入口、Web Push（VAPID + Service Worker + Cron）、以及可重複執行的 SQL migration。

**實際達成：**  
- 兩份 migration：`profiles` / `task_templates` / `daily_logs` / `daily_reviews` + `subscriptions` / `notification_settings`，含 RLS 與觸發器。  
- Next.js 14 App Router 主頁：`seedTodayLogs` + `TaskChecklist`（`useOptimistic`）、`DailyProgress`、`TaskItem` 備註展開。  
- `/login`（OTP Magic Link）+ `/auth/callback` + `middleware` 保護路由。  
- `/templates`：建立模板、列表、首頁「管理模板」與空狀態 CTA。  
- `@ducanh2912/next-pwa` + `worker/index.ts`（push / notificationclick）+ `app/manifest.ts`。  
- `lib/web-push.ts`、`/api/push/cron`、通知開關與時區對齊邏輯（如 Asia/Singapore）。  
- 修正 `customWorkerSrc`、移除不兼容的 `Database` 泛型（暫時）、補齊 cookie `setAll` 型別與 `daily_logs` seed 欄位，**`npm run build` 可通過**。

**關鍵 Prompt（節錄）：**  
> 「幫我在 DailyVibe 新增一個 /login 頁面，使用 Supabase Email Magic Link 登入，登入後跳轉到首頁 /」  
> 「任務模板新增與管理 — Implement the plan」  
> 「解決以上問題」（PWA 路徑、`.next`、TypeScript、`worker` 編譯）

---

## 2. 🏗 專案架構總覽 (System Architecture)

### 項目目錄樹（簡化）

```
daily-vibe/
├── app/
│   ├── api/push/cron/route.ts    # 定時推播入口（Bearer CRON_SECRET）
│   ├── auth/callback/route.ts    # OAuth/Magic Link code 換 session
│   ├── login/page.tsx
│   ├── templates/page.tsx
│   ├── page.tsx                  # 今日清單（Server + Client 子元件）
│   ├── layout.tsx, manifest.ts, globals.css
├── components/                   # DailyProgress, TaskChecklist, TaskItem, TemplateForm, Notification*
├── components/ui/                # Shadcn 風格 primitives
├── lib/
│   ├── actions/                  # daily-logs, push, task-templates (Server Actions)
│   ├── supabase/client.ts | server.ts
│   ├── web-push.ts, category-styles.ts, utils.ts
├── worker/index.ts               # 合併進 Workbox SW（push 事件）
├── middleware.ts
├── public/                       # sw.js, workbox, icons（README）
├── supabase/migrations/*.sql
├── types/database.ts
├── next.config.js, tailwind.config.ts, package.json
└── .env.local.example
```

### 技術棧 (Tech Stack)

| 層級 | 技術 |
|------|------|
| 框架 | Next.js 14（App Router）、React 18、TypeScript |
| 樣式 | Tailwind CSS、tailwindcss-animate、CVA |
| UI | Shadcn/Radix（Card、Progress、Checkbox、Button、Input、Label…）、Lucide |
| 後端資料 | Supabase（Postgres + Auth + RLS） |
| 客戶端 SDK | `@supabase/ssr`、`@supabase/supabase-js` |
| PWA | `@ducanh2912/next-pwa`（Workbox + `customWorkerSrc: 'worker'`） |
| 推播 | `web-push`（VAPID）、外部 Cron 呼叫 `/api/push/cron` |

### 各層職責 (Responsibilities)

- **UI / View 層**  
  首頁與 `/templates`、`/login` 的版面與互動；`TaskChecklist` 樂觀更新勾選與備註；`NotificationToggle` 權限與時間設定；`DailyProgress` 顯示完成率。

- **Logic / Core 層**  
  Server Actions：`seedTodayLogs`、狀態/備註更新、模板 CRUD、訂閱與通知設定；Cron route 依用戶時區比對時刻並 `web-push.sendNotification`；`middleware` 刷新 JWT 並重導未登入使用者。

- **Data / State 層**  
  Supabase 表：`task_templates` → 驅動每日 `daily_logs` 生成；`subscriptions` + `notification_settings` 支援推播；Session 經 cookie 由 `@supabase/ssr` 同步；型別集中於 `types/database.ts`（與執行時 client 泛型暫解耦）。

---

## 3. 🎮 應用主要互動流程 (Interaction Flow)

**觸發：** 使用者開啟 PWA 或網頁首頁（已登入）。

**邏輯處理：**  
Server Component 呼叫 `seedTodayLogs`（依當日與 active 模板 upsert `daily_logs`），再 `fetchTodayLogs` 帶出 `task_templates` join；客戶端勾選觸發 `updateLogStatus` + `revalidatePath`；備註 blur 寫入 `updateLogNote`。

**反饋：**  
頂部進度條與卡片清單即時反映完成數；無模板時引導至 `/templates`；推播於排程命中時經 SW 顯示系統通知。

**（登入支線）**  
觸發：輸入 Email → Magic Link。  
邏輯：`signInWithOtp` → 使用者點信內連結 → `/auth/callback` `exchangeCodeForSession`。  
反饋：Cookie 寫入後導向 `/`。

---

## 4. 🧱 撞牆與破局 (Wall & Solution)

| 問題 | 解法 |
|------|------|
| `Invalid API key` | `.env.local` 誤把 VAPID 金鑰填進 `NEXT_PUBLIC_SUPABASE_ANON_KEY`；改為 Supabase Publishable / Secret，VAPID 獨立欄位。 |
| `ENOENT … middleware-manifest.json` | `.next` 不完整（建置曾失敗）；`rm -rf .next` 後重跑 dev/build。 |
| `ENOTDIR … worker/index.ts/index.ts` | `customWorkerSrc` 必須為**目錄**（`worker`），不可寫 `worker/index.ts`。 |
| `.upsert()` 推斷為 `never` | 手寫 `Database` 未滿足 postgrest-js `GenericTable`（含 `Views: {}`、`Relationships` 等）；短期移除 `createServerClient<Database>` 泛型以通過建置；長期應改用 `supabase gen types`。 |
| `worker/index.ts` 型別與 `self` 衝突 | 子編譯與 DOM 型別疊加；改以 `Event` + 窄化結構、`self as any` 於 SW 檔案內務實處理。 |
| `setAll` 隱式 `any` | 為 `cookiesToSet` 補上明確陣列元素型別（callback / server / middleware）。 |

---

## 5. ✨ Aha! Moment

**PWA 插件的 `customWorkerSrc` 語意是「資料夾」而非「單一檔案路徑」**——與直覺相反；錯一個字就讓整次 `next build` 失敗，進而污染 `.next`，表現成執行期找不到 `middleware-manifest.json`。這說明 **建置錯誤要優先修復並清快取**，否則除錯會被二次症狀帶偏。

另一點：**Supabase 官方產生的型別與手寫 `Database` 的相容門檻比預期高**；在沒有 codegen 前，寧可暫時放棄 client 泛型換取穩定建置，再排程補回型別，比長期與 `never` 搏鬥划算。

---

*本日誌依對話脈絡與 `daily-vibe/` 目錄現狀整理；若與本機未提交變更有出入，以版本庫為準。*
