# 功率放大器互動教學（Power Amplifier Series）

功率放大器 Class A／B／AB／C／D 的中英雙語互動教學頁，以手機喇叭為應用主軸。第一階段（MVP）：系列首頁、01 導通角與效率、04 Class-D 開關放大、05 輸出濾波器設計；02 線性輸出級、03 熱設計、06 PCB 佈線與 EMI、07 射頻功率放大器規劃中。

- `_site/`：Vercel 部署的靜態網站（`index.html` 系列首頁＋各頁，共用 `assets/`）
- `_src/`：產生器。`shell.html` 共用版型，`series.css`（沿用 DC-DC／PoE 系列樣式）＋`amp.css`，`common.js` 放共用函式（滑桿、圖表、複數運算、縮寫表），各頁內容是 `*.part.html`
- 更新流程：修改 `_src/` → `python _src/build.py` → commit 並 push

內容依據：附件 Gemini 對話原稿（經 Claude 驗算與修正）、標準電路理論、TI SLOA145／TAS2563 與 Cirrus Logic CS35L41 公開資料。相關系列：[DC-DC 拓撲系列](https://dcdc-topology-series.vercel.app/)。頁面為教學模型，實際設計請以晶片規格書為準。
