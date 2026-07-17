# PaiShare

本機分帳 App（Android / iOS / Web，基於 Expo）。同行雜支、誰墊付、一對一特殊支出，結束後輸出「誰給誰多少」。

- **目前**：純本機、免登入，資料存在裝置（或瀏覽器）上  
- **規劃中**：可選雲端同步（尚未實作）

---

## 功能

| 功能 | 說明 |
|------|------|
| 行程 | 建立／重新命名／刪除；成員至少 2 人 |
| 成員 | 加人；長按移除（不可少於 2 人） |
| 均攤 | 誰墊、誰分攤；金額以「分」計算 |
| 一對一 | 誰該付給誰（打牌、代買等） |
| 結算 | 餘額沖銷 → 最少轉帳清單；可標記已付清 |
| 備份 | 可匯出行程 JSON |

---

## 技術棧

| 項目 | 技術 |
|------|------|
| 框架 | Expo SDK 57、React Native 0.86、React 19 |
| 語言 | TypeScript（strict） |
| 路由 | Expo Router |
| 狀態 | Zustand + AsyncStorage persist |
| 字型 | Fraunces、Outfit |

文件：https://docs.expo.dev/versions/v57.0.0/

---

## 架構

```
app/（畫面）
  → src/storage/store.ts（Zustand，trips 為 SSOT）
       ├─ AsyncStorage
       └─ src/lib/（純函式：settlement、remove-person）
```

無後端、無登入。結算與移除成員規則集中在 `src/lib/`，方便單測，避免與 UI 分叉。

### 目錄

```
app/                 # Expo Router 畫面
src/components/      # UI 元件
src/lib/             # 結算、移除成員
src/models/          # 型別
src/storage/         # Zustand store
src/theme/           # design tokens
```

路徑別名：`@/*` → `src/*`

### 資料模型（摘要）

- `Trip`：成員、支出、結算已付清標記  
- `Expense`：`split`（均攤）或 `transfer`（一對一）discriminated union  
- 結算結果由現況支出衍生；變更支出／成員後會清空舊的已付清標記  

### 結算要点

- 金額以整數「分」運算，餘數分給分攤名單前幾人，避免浮點誤差  
- 以 greedy 配對最大債務人與最大債權人，產生最少轉帳建議  

---

## 開發

需要 Node.js（建議 22+）。本倉庫可選使用目錄內 `.venv` 可攜式 Node（見 `.venv/Activate.ps1`）；一般環境直接用系統 Node 即可。

```bash
npm install --legacy-peer-deps
npm start
```

用手機安裝 [Expo Go](https://expo.dev/go)，同一區網掃描 QR code。

| 指令 | 說明 |
|------|------|
| `npm start` | 開發伺服器 |
| `npm run android` / `ios` / `web` | 指定平台 |
| `npm run test:lib` | 領域邏輯 selfcheck |
| `npx tsc --noEmit` | 型別檢查 |

---

## 測試

```bash
npm run test:lib
```

涵蓋均攤、一對一、不可整除金額、移除成員等案例。修改 `src/lib/settlement.ts` 或 `remove-person.ts` 後請執行。

---

## 路線圖

後續可接雲端同步（例如 Supabase 或 Firebase）。一期不需任何雲端服務；`tripId` 等識別已預留。
