# PaiShare

本機分帳 App（Android / iOS via Expo）。同行雜支、誰墊付、一對一特殊支出，當天結束輸出「誰給誰多少」。

## 虛擬環境（Node）

本專案使用目錄內可攜式 Node（`.venv`），不依賴系統全域安裝。

```powershell
cd <project-directory>
.\\.venv\Activate.ps1
```

啟動後可用 `node` / `npm` / `npx`。

> `.venv` 已加入 `.gitignore`。若換機需重建：下載 [Node Windows x64 zip](https://nodejs.org/dist/) 解壓到 `.venv`，並保留 `Activate.ps1`。

## 開發

```powershell
.\\.venv\Activate.ps1
npm install --legacy-peer-deps
npm start
```

用手機安裝 **Expo Go**，掃描 QR code 即可跑（同一區網）。

- Android：`npm run android`
- iOS（需 macOS 或 Expo Go）：`npm run ios`

## 功能（一期）

- 建立行程與成員（本機、免登入）
- **均攤**：誰墊、誰分攤
- **一對一**：誰該付給誰（打牌／代買等）
- 結算：餘額沖銷 → 最少轉帳清單，可標記已付清

## 測試

```powershell
npm run test:settlement
```

## 二期同步（尚未實作）

本機資料已有 `tripId`，之後可接：

- **Supabase**：Auth + Postgres + Realtime（建議）
- **Firebase**：Auth + Firestore

一期**不必**開通任何雲端服務。
