📅 [2026-04-01] Vibe Coding Log  
🌊 今日開發狀態： ★★★★☆（4/5）— 架構改版與部署鏈路一次補齊；摩擦主要來自「遠端 DB／遠端建置與本機認知不同步」而非程式語法本身。

---

## 1. 🛠 核心進度與突破 (Core Progress)

**今日目標：**  
將 DailyVibe 從「Magic Link + 單頁清單」升級為可產品化的結構：信箱密碼認證、本日／每周／新增任務導覽、首頁多區塊（含健康管理）、任務模板支援預設／自訂類別與循環／單一任務，並完成 Supabase schema 與 GitHub／Vercel 交付鏈排查。

**實際達成：**  
- 實作並推送 **`fa9360c`**：`signInWithPassword`／`register`、`app/(main)` 底欄、`GroupedDayChecklist`、`WellnessCard`、`TodayClock`、`/weekly`、TemplateForm 之 recurrence／自訂類別、`seedTodayLogs` 依 `recurrence` 篩選、過期單次模板自動停用。  
- 新增 migration **`003_daily_wellness`**、**`004_task_recurrence`** 與對應型別／actions。  
- 先前會話中已處理：白畫面疑難（`NotificationToggle` 與 `serviceWorker.ready`、PWA 導覽快取、`error.tsx`／`global-error.tsx`）、GitHub 倉庫建立與首次 push、`auth_code_error` 與「GitHub 仍停在 Initial commit」之根因歸因（未部署最新 build／Redirect URL／舊信與 PKCE）。

**關鍵 Prompt：**  
「執行」（接受完整改版計畫並實作）；「push 最新版本到 github」（將本地與遠端同步，解除線上舊版與設定不一致）。

---

## 2. 🏗 專案架構總覽 (System Architecture)

### 項目目錄樹 (Structure)

```plaintext
daily-vibe/
├── app/
│   ├── (main)/                 # 登入後壳：底欄 + 主要業務頁
│   │   ├── layout.tsx
│   │   ├── page.tsx            # 本日任務首頁
│   │   ├── templates/page.tsx  # 新增任務
│   │   └── weekly/page.tsx     # 每周日誌（唯讀歷史）
│   ├── api/push/cron/route.ts
│   ├── auth/callback/route.ts
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── error.tsx
│   ├── global-error.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── manifest.ts
├── components/                 # UI + 業務元件（含 ui/*）
├── lib/
│   ├── actions/                # Server Actions（daily-logs, task-templates, push, wellness）
│   ├── supabase/               # server / client 建構子
│   ├── task-categories.ts
│   ├── category-styles.ts      # 轉發 task-categories
│   ├── utils.ts, web-push.ts
├── types/database.ts
├── supabase/migrations/        # 001–004 SQL
├── worker/index.ts             # PWA custom worker（推播）
├── middleware.ts
├── next.config.js
└── tailwind.config.ts
```

（`node_modules/`、`.next/`、`public/sw*.js` 等建置產物未列入。）

### 技術棧 (Tech Stack)

- **語言：** TypeScript  
- **框架：** Next.js 14 App Router、React 18  
- **樣式：** Tailwind CSS、Radix UI（checkbox 等）  
- **後端 BaaS：** Supabase（Postgres + RLS、GoTrue Auth）  
- **PWA：** `@ducanh2912/next-pwa`、自訂 `worker`、Web Push（`web-push`）  
- **部署：** Vercel（慣例）、Git 遠端 GitHub  

### 各層職責說明 (Responsibilities)

| 層級 | 職責 |
|------|------|
| **UI/View** | `app/(main)/*`、`components/*`：本日分區清單、健康管理表單、底欄導覽、登入／註冊表單、每周唯讀列表；客戶端樂觀更新與時鐘。 |
| **Logic/Core** | `middleware.ts`（session 刷新與公開路徑）、`lib/actions/*`（任務 seed／CRUD、wellness upsert、推播設定）、`seedTodayLogs` 之 recurrence 規則。 |
| **Data/State** | Supabase 表：`profiles`、`task_templates`（含 `recurrence`／`occurrence_date`）、`daily_logs`、`daily_wellness`、推播相關表；RLS 以 `auth.uid()` 隔離；Server Components 取數 + Server Actions 寫入。 |

---

## 3. 🎮 應用主要互動流程 (Interaction Flow)

**觸發：** 使用者於 `/register` 註冊或 `/login` 以信箱密碼登入；於本日頁勾選任務、編輯備註、填寫健康管理；於「新增任務」建立循環或單一任務模板；切換底欄至「每周」檢視歷史 `daily_logs`。

**邏輯處理：** Middleware 刷新 JWT 並守護路由；首頁並行 `seedTodayLogs`（依 `daily`／`once`+日期過濾）與 `fetchTodayLogs`、`getWellnessForDate`；客戶端 `useOptimistic` 更新狀態並呼叫 Server Actions 寫回 Postgres；單次任務於 `occurrence_date < today` 時由 seed 路徑標記 `is_active=false`。

**反饋：** 分區渲染（提醒／五類／其他）、進度條、wellness 儲存提示、每周依日期聚合之唯讀卡片；認證失敗或 callback 錯誤導向登入並帶查詢參數（設計上應以 `/login` 為主）。

---

## 4. 🧱 撞牆與破局 (Wall & Solution)

| 問題 | 解法 |
|------|------|
| 開發環境白畫面／互動異常 | 避免在無 SW 時依賴 `navigator.serviceWorker.ready` 無限 pending；關閉過度 aggressive 的 PWA 導覽快取；補 `error.tsx`／`global-error.tsx` 可觀測失敗。 |
| `auth_code_error`、URL 設定「無感」 | 區分 **Supabase 設定** 與 **前端部署版本**：Redirect 須含 `https://<prod>/auth/callback`；**必須**將含密碼登入之 commit 推上 GitHub 並讓 Vercel 建置最新版；驗證／重設密碼信需用新信、同瀏覽器 PKCE。 |
| GitHub 僅 Initial commit、線上仍 Magic Link | `git add/commit/push` 將 `fa9360c` 推上 `origin/main`，使 Vercel 與 Supabase 設定指向的應用版本一致。 |
| SQL Editor 執行失敗 | 貼上 **檔案內 SQL 全文**，非檔案路徑字串。 |

---

## 5. ✨ Aha! Moment

**「設定正確」與「使用者看得到行為改變」之間，還隔著一次成功的 Git push 與 Vercel Production build。** 後台 URL、Email Provider 再完美，若邊緣仍跑舊 bundle，所有症狀都會像「設定沒存檔」。將 **交付鏈（Git → CI/CD → 瀏覽器快取）** 納入除錯預設路徑，可顯著降低假性 Bug 工時。

---

*本日誌依對話脈絡與 repo 現狀整理；若與實際部署時間軸有落差，以 Git commit 時間與 Vercel Deployment 紀錄為準。*
