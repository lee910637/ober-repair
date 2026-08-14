# 歐伯維修

17108A-5-120 維修診斷 PWA — 原型

前線技術員用的維修診斷小工具，離線可用，可加入 iPhone 主畫面。內容取材自 Chroma 17108A-5-120 電池化成測試器維修手冊。

> repo 名稱使用英文代稱 `ober-repair`（GitHub repo 名稱不支援中文），對內識別名稱為「歐伯維修」。

## 線上網址

https://lee910637.github.io/ober-repair/

由 GitHub Pages 提供（見本 repo 設定 → Pages）。iPhone Safari 開啟後，分享 → 加入主畫面，即可離線使用。

## 資料維護（Excel 為主，網站唯讀）

1. 編輯 `authoring/17108A-5-120_診斷資料.xlsx`（三張表：異常資訊、確認資訊、判斷節點）。
2. 重新產生網站用的資料檔：
   ```bash
   cd authoring
   pip install openpyxl
   python build_data.py
   ```
   這會覆寫 `data/diagnosis-data.json`。網站本身不讀 Excel，也不能編輯資料。
3. 提交並推送變更，GitHub Pages 會自動重新部署。

## 本機預覽

```bash
python3 -m http.server 8000
```
用瀏覽器打開 http://localhost:8000 。

## 目前涵蓋範圍

- 完整逐步查修流程：**OCP／OVP 保護**（8步）、**FAN 風扇異常**（3步）、**無輸出電壓/DVM無讀值**（8步，最深分支）。
- 其餘 6 項（Calibration Error、OTP、接觸錯誤、網路通訊異常、System Config Error、ADC Error）目前只顯示說明與手冊章節指引，尚未建置逐步流程（首頁卡片會標示「建置中」）。
- 不含：App 內編輯介面、維修結果回報/歷史紀錄、多機型支援。

## 注意

本 repo 為 **public**，內容包含維修手冊的技術細節（電路測試點、元件規格值等），任何人皆可檢視。若日後需要限制存取，需改用 private repo + GitHub Pro/Team 方案，或改用其他具存取控制的靜態網站服務。
