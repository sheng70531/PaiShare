# PaiShare

本機分帳 App（Android / iOS，Expo）。同行雜支、誰墊付、一對一特殊支出，當天結束輸出「誰給誰多少」。

- **一期**：純本機、免登入、資料存在裝置上
- **二期**（尚未實作）：可接雲端同步（Supabase / Firebase）

---

## 目錄

- [功能](#功能)
- [技術棧](#技術棧)
- [架構](#架構)
- [資料模型](#資料模型)
- [目錄結構](#目錄結構)
- [核心演算法](#核心演算法)
- [環境與開發](#環境與開發)
- [測試](#測試)
- [二期規劃](#二期規劃)

---

## 功能

| 功能 | 說明 |
|------|------|
| 行程 | 建立／重新命名／刪除；成員至少 2 人 |
| 成員 | 加人；長按移除（護欄：不可少於 2 人） |
| 均攤支出 | 誰墊、誰分攤；金額量化到「分」 |
| 一對一支出 | 誰該付給誰（打牌、代買等） |
| 結算 | 餘額沖銷 → 最少轉帳清單；可標記已付清 |
| 備份 | 行程詳情可「匯出 JSON」經系統分享選單帶走 |

---

## 技術棧

| 層級 | 技術 | 版本／備註 |
|------|------|------------|
| 執行環境 | Expo（Managed） | SDK **57** |
| UI | React Native | **0.86**（New Architecture 已啟用） |
| 語言 | TypeScript | strict mode |
| 框架 | React | **19** |
| 路由 | Expo Router | file-based，`app/` |
| 狀態 | Zustand | persist middleware |
| 持久化 | AsyncStorage | key：`paishare-v1` |
| 字型 | Fraunces + Outfit | `@expo-google-fonts/*` |
| 手勢／動畫 | gesture-handler、reanimated、worklets | Expo 相容版本 |
| 安全區 | react-native-safe-area-context | |
| 開發工具 | tsx | 跑 Node 端 selfcheck |
| 平台 | Android / iOS | Expo Go 或原生建置；亦支援 `web` |

文件以 Expo 官方版本為準：https://docs.expo.dev/versions/v57.0.0/

---

## 架構

### 總覽

```
┌─────────────────────────────────────────────────────────┐
│  app/（Expo Router 畫面）                                │
│  index → trip/new → trip/[id] → expense / settle        │
└───────────────────────────┬─────────────────────────────┘
                            │ 訂閱 / 呼叫 actions
┌───────────────────────────▼─────────────────────────────┐
│  src/storage/store.ts（Zustand + persist）               │
│  trips[] 為單一真實來源（SSOT）                           │
└───────────┬─────────────────────────────┬───────────────┘
            │                             │
            ▼                             ▼
┌───────────────────────┐   ┌─────────────────────────────┐
│ AsyncStorage          │   │ src/lib/（純函式領域邏輯）    │
│ paishare-v1           │   │ settlement / remove-person  │
└───────────────────────┘   └─────────────────────────────┘
```

一期刻意**無後端、無 auth**：畫面只透過 store 讀寫；結算與移除成員的規則放在可單測的純函式，避免 UI／儲存層長出分叉邏輯。

### 分層職責

| 層 | 路徑 | 職責 |
|----|------|------|
| 路由／畫面 | `app/` | 導航、表單驗證提示、組裝 UI |
| 元件 | `src/components/` | 可重用按鈕、欄位、成員選擇、支出列 |
| 狀態 | `src/storage/store.ts` | CRUD trip／人／支出／結算標記；persist |
| 領域邏輯 | `src/lib/` | 結算、移除成員影響計算（無 React） |
| 模型 | `src/models/types.ts` | Trip / Expense 等型別 |
| 設計 token | `src/theme/tokens.ts` | 色票、字級、間距、字型名 |

### 畫面流程

```
首頁（行程列表）
  ├─ 建立行程 → 輸入名稱與成員（≥2）→ 進入行程詳情
  └─ 點行程 → 行程詳情
                ├─ 記一筆（均攤 / 一對一；可編輯刪除）
                ├─ 結算（衍生轉帳清單 + 已付清標記）
                ├─ 重新命名 / 加人 / 長按移除
                └─ 匯出 JSON / 刪除行程
```

### 資料流重點

1. **Hydration**：`_layout` 等字型與 Zustand `persist` 完成後才渲染 Stack，避免閃空狀態。
2. **結算為衍生資料**：`settleTrip(people, expenses)` 每次由現況算出；`settlementMarks` 只存「這筆建議是否已付清」。
3. **失效策略**：新增／修改／刪除支出，或移除成員後，會清空該行程的 `settlementMarks`，避免舊標記對到錯誤金額。
4. **金額**：UI 存檔前量化到分（`Math.round(x*100)/100`）；結算內部用整數「分」運算，避免浮點餘額不封閉。

---

## 資料模型

```typescript
Trip {
  id, title, createdAt, updatedAt
  people: Person[]          // { id, name }
  expenses: Expense[]       // SplitExpense | TransferExpense
  settlementMarks: SettlementMark[]  // { fromId, toId, amount, paid }
}

SplitExpense     // type: 'split'    — paidById + participantIds
TransferExpense  // type: 'transfer' — fromId → toId
```

- `Expense` 為 **discriminated union**（以 `type` 區分），編輯時必須依模式重建乾淨物件，不可把均攤欄位殘留在一對一上。
- 匯出備份即為單一 `Trip` 的 JSON（經系統 Share）。

---

## 目錄結構

```
PaiShare/
├── app/                          # Expo Router
│   ├── _layout.tsx               # 字型、hydration、Stack
│   ├── index.tsx                 # 首頁行程列表
│   └── trip/
│       ├── new.tsx               # 建立行程
│       └── [id]/
│           ├── index.tsx         # 行程詳情
│           ├── expense.tsx       # 記一筆／編輯
│           └── settle.tsx        # 結算
├── src/
│   ├── components/               # UI 元件
│   ├── lib/
│   │   ├── settlement.ts         # 餘額與最少轉帳
│   │   ├── remove-person.ts      # 移除成員對支出的影響
│   │   └── *.selfcheck.ts        # Node assert 自檢
│   ├── models/types.ts
│   ├── storage/store.ts          # Zustand store
│   └── theme/tokens.ts
├── assets/                       # icon / adaptive icon
├── app.config.js                 # Expo 設定（scheme: paishare；Pages 時 baseUrl）
├── .github/workflows/            # GitHub Pages 自動部署
├── package.json
└── README.md
```

路徑別名：`@/*` → `src/*`（見 `tsconfig.json`）。

---

## 核心演算法

### 結算（`src/lib/settlement.ts`）

1. **算餘額（整數分）**  
   - 均攤：墊付人 `+amount`；每位分攤人 `-share`；無法整除的餘數分給名單前幾個參與者各多 1 分。  
   - 一對一：`from -amount`、`to +amount`。
2. **最少轉帳（greedy）**  
   最大債務人 ↔ 最大債權人配對，直到兩側清零。
3. **輸出** `TransferSuggestion[]`：`{ fromId, toId, amount }`（元，兩位小數）。

### 移除成員（`src/lib/remove-person.ts`）

- 少於或等於 2 人：拒絕移除。  
- 若為均攤**墊付人**或一對一任一方：刪除該筆支出。  
- 若只在分攤名單：從 `participantIds` 拿掉；名單變空則刪除。  
- UI 預覽（刪幾筆／改幾筆）與實際套用共用同一套純函式，避免規則漂移。

---

## 環境與開發

### 虛擬環境（Node）

本專案使用目錄內可攜式 Node（`.venv`），不依賴系統全域安裝。

```powershell
cd <project-directory>
.\\.venv\Activate.ps1
```

啟動後可用 `node` / `npm` / `npx`。

> `.venv` 已加入 `.gitignore`。換機重建：下載 [Node Windows x64 zip](https://nodejs.org/dist/) 解壓到 `.venv`，並保留 `Activate.ps1`。

### 安裝與啟動

```powershell
.\\.venv\Activate.ps1
npm install --legacy-peer-deps
npm start
```

用手機安裝 **Expo Go**，掃描 QR code（同一區網）。

| 指令 | 說明 |
|------|------|
| `npm start` | Expo 開發伺服器 |
| `npm run android` | 開 Android |
| `npm run ios` | 開 iOS（需 macOS 或 Expo Go） |
| `npm run web` | 瀏覽器本機預覽 |
| `npm run export:web` | 匯出靜態 web 到 `dist/` |
| `npm run deploy` | 匯出並推到 `gh-pages` 分支（需已設 Pages） |
| `npm run test:lib` | 領域邏輯 selfcheck |
| `npm run test:settlement` | 僅結算 selfcheck |

### GitHub Pages（網址免安裝）

- **網址：** https://<your-github-username>.github.io/PaiShare/
- **一鍵設定（只需一次）：** Repo → **Settings** → **Pages** → Source 選 **Deploy from a branch** → Branch 選 **`gh-pages`** / `/ (root)` → Save
- 之後每次推 `master`，GitHub Actions 會自動重新匯出 web 並更新 `gh-pages`
- 本機手動部署：`npm run deploy`

注意：

- 資料仍存在**該瀏覽器本機**（非多人即時同步）
- 動態行程路由為 SPA；已產生 `404.html` 作為重新整理後備

---

## 測試

領域邏輯以 Node `assert` selfcheck 驗證（不依賴 Jest／裝置）：

```powershell
npm run test:lib
```

涵蓋：

- 均攤／部分參與／一對一／混合沖銷  
- 不可整除金額（如 100÷3）餘額總和為 0  
- 多債權人 greedy 轉帳合計吻合  
- 移除成員：刪除、修剪分攤名單、最少 2 人護欄  

建議在改 `settlement.ts` 或 `remove-person.ts` 後必跑。

型別檢查：

```powershell
npx tsc --noEmit
```

---

## 二期規劃

本機資料已有穩定的 `tripId`／`Person.id`，之後可接：

| 選項 | 用途 |
|------|------|
| **Supabase**（建議） | Auth + Postgres + Realtime |
| **Firebase** | Auth + Firestore |

一期**不必**開通任何雲端服務。接同步時建議：

1. 在信任邊界重做金額與成員驗證（目前主要靠 UI）。  
2. 為 `Trip` 加版本／衝突策略（last-write 或 CRDT 視需求）。  
3. 保留 JSON 匯出作為離線逃生艙。
