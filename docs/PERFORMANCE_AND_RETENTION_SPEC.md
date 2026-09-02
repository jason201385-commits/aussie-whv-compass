# 澳打指南針 — 效能、無障礙與留存機制規格（PERFORMANCE_AND_RETENTION_SPEC）

本文件是 [`SPEC.md`](SPEC.md) 的延伸規格，沿用其 P0／P1／P2 編號體系與
[`SDD.md`](SDD.md) 的架構與設計系統約束。閱讀順序：SDD §1.1 不可協商原則 →
SPEC §0 執行者邊界 → 本文件。

- **建立日期**：2026-09-01
- **最後複查**：2026-09-01（第二輪獨立複查，見 §0.1 修訂紀錄）
- **對應 commit**：`cb23ed0` feat: add safe arrival and departure exchange
- **資產版本**：規格撰寫時 `20260901-43`；P0-5／P0-6 上線後為 `20260901-45`（以 `index.html` 為準）
- **狀態**：P0-5、P0-6 已上線（commit a823e88）；其餘項目未開始。各項狀態以 `ROADMAP.md` §1 為準
- **最後更新**：2026-09-02（狀態同步；逐次證據摘要移至 `DECISIONS.md` D-2026-09-01-01）
- **來源**：2026-09-01 全站健檢（Lighthouse + Chrome Performance trace + 逐檔審查）
  與同日 ai-orchestra 產品討論（Grok 受眾行為／MiniMax 產品機制／AGY 反方審查）

## 0.1 第二輪複查修訂紀錄（2026-09-01）

初版規格寫於 commit `070f3cc`。其後 `cb23ed0` 新增 `market.html`
（離澳出清 × 初登澳補給），並改動 `style.css`(+100 行)、`tools.js`(+94 行)
與全站資產版本。以下為複查後的修正：

| # | 項目 | 初版 | 更正後 |
|---|---|---|---|
| 1 | 全站頁數 | 14 頁 | **15 頁**（新增 `market.html`） |
| 2 | LCP 基線 | 2,469 ms（單次） | **中位數 2,566 ms，全距 2,069–2,803**（3 次）。初版單次值落在雜訊範圍內 |
| 3 | LCP 驗收方式 | 單次量測 ≤1,800 ms | **中位數 5 次**＋全距限制（見 §1.0） |
| 4 | `background-attachment: fixed` 列為手機捲動成本 | 列入 P2-3 | **移除**——`style.css:2771` 於 `@media (max-width:640px)` 已改回 `scroll`，手機根本沒生效 |
| 5 | 多處行號 | 依舊版檔案 | 全部重新定位（見各項） |
| 6 | `.ics` UID 去重可跨客戶端保證 | 列為驗收門檻 | **降級**為逐客戶端記錄行為（見 P1-16） |
| 7 | `.ics` 格式 | 缺 `DTEND`／`METHOD` | 補上，並標註 `DTEND` 為排他性 |
| 8 | 官方數字正確性 | 未查證 | **已獨立查證四項承重數字，全部正確**（見 §A.0） |

**未變更的結論**：P0-5、P0-6 三項缺陷在 `market.html` 上完整重現，
確認為全站問題而非個別頁面問題。

## 0.2 量測方法與 P0-5／P0-6 實作摘要（2026-09-01 完成，commit a823e88）

> 本節的量測方法是此後的標準流程（契約）；逐次數值屬證據，摘要已登錄 `DECISIONS.md` D-2026-09-01-01。
> 反方審查（2026-09-02）裁決：LCP +196 ms 落在前次全距內，只能寫「未偵測到顯著變化」，不能寫成達成「不上升」；
> `domInteractive` 下降不等於功能可用時間下降。

### 量測方法改版（第三輪）

前兩輪用 Chrome Performance trace，全距達中位數的 35%，無法判定任何改動。
本輪改用 **冷快取（`reload` + `ignoreCache`）+ 頁內 `PerformanceObserver`**：

| 方法 | 中位數 | 全距 | 全距/中位數 |
|---|---|---|---|
| trace（快取狀態不定） | 2,566 ms | 734 ms | **35%** |
| 冷快取 + PerformanceObserver | 5,160 ms | 252 ms | **4.9%** |

冷快取的絕對值較高，因為它才是**首次造訪者**的真實情境
（從搜尋結果點進來、regional 4G）。這是本規格此後的標準量測法。

**附帶推翻**：第二輪記錄的「LCP 元素三次都不同（nodeId 157/159/117）」
是 trace 法快取狀態不一致造成的**假象**。
冷快取下 10 次量測，LCP 元素**每次都是同一個 H1**。

### 改動前後（各 5 次，冷快取）

| 指標 | 改動前中位數 | 改動後中位數 | 差異 | 判定 |
|---|---|---|---|---|
| `.js` render-blocking | 5 支 | **0 支** | — | ✅ **主門檻達成** |
| `domInteractive` | 5,411 ms | **818 ms** | **−4,593 ms（−85%）** | ✅ **遠超雜訊，真實改善** |
| LCP | 5,160 ms | 5,356 ms | +196 ms | ⚠️ **在雜訊內（前全距 252 ms），視為未變** |
| CLS | 0.00 | 0.00 | — | ✅ 無回歸 |
| Lighthouse a11y（3 頁） | 93 / 93 / 93 | **100 / 100 / 100** | +7 | ✅ 0 failed |

改動前 LCP：5,080 / 5,140 / 5,160 / 5,228 / 5,332
改動後 LCP：5,184 / 5,308 / 5,356 / 5,408 / 5,416

### 必須更正的一項判斷：LCP 不是被腳本擋住的

第二輪曾據「LCP ≈ domInteractive」推論 LCP 受五支腳本阻擋。
**這個推論是錯的。** 兩者接近只是因為都在等同一條網路佇列。
加上 `defer` 後 `domInteractive` 掉了 4.6 秒，**LCP 完全沒動**。

冷快取下的資源時序給出真正的原因：

```
first-paint = FCP = LCP = 5,356 ms   ← 5.3 秒前整頁空白
  ├─ /css2（Google Fonts CSS）  198 KB  render-blocking  結束於 3,407 ms
  ├─ assets/style.css            98 KB  render-blocking  結束於 2,818 ms
  └─ 其後約 1.9 秒為 4x CPU 下的 CSS 解析／樣式／版面計算
```

**Google Fonts 的 stylesheet 是全站最大的單一資源（198 KB），比 `style.css` 還大，
而且 render-blocking。** 它之所以這麼大，是因為請求了 6 個 CJK 字重
（Noto Sans TC 400/500/700/900 + Noto Serif TC 700/900），
每個字重被切成約 106 個 unicode-range `@font-face`，
瀏覽器實際載入了 **636 個 font face 宣告**。

> 註：`document.fonts.ready` 在約 640 ms 就解析，一度讓人誤判「字型不是瓶頸」。
> 那個 API 反映的是**字型檔**載入完成，不是**字型 stylesheet** 的阻擋成本。

### 因此：P2-4 應升級，且理由與原本假設不同

原本 P2-4 的理由是「字型 swap 造成 LCP 元素不穩定」——**該假設已證偽**。
新的、有實測依據的理由是：**198 KB render-blocking stylesheet 是目前 LCP 的最大單一槓桿**。
這是 P0-5 完成後唯一還擋著首次繪製的東西（除了 `style.css` 本身）。

（P2-3 的兩項繪製成本仍未量測，且與 FCP 無關——FCP 之前根本沒有畫面可捲動。
 排序上應排在 P2-4 之後。）

### 實際改動的檔案

| 檔案 | 改動 |
|---|---|
| 15 頁根層 HTML + 46 個 `lang/**` 頁 | 235 個 `<script src>` 加上 `defer` |
| `scripts/build_i18n.py` | 產生器同步加 `defer`（3 處）；`Go` 按鈕 aria-label |
| `assets/style.css` | `.language-go` `color: var(--ink)` → `var(--on-gold)`；新增 `.note a, .warn a, .tip a` 底線規則；`font-weight: 800` → `900`（34 處） |
| `assets/i18n.js` | 由 `build_i18n.py` 重新產生（aria-label） |
| `assets/main.js` | 感謝連結 aria-label；搜尋索引版本字串 |
| 全專案 | `ASSET_VERSION` `20260901-43` → `20260901-44`，重跑三支 build 腳本 |

### 字型字重：`800` → `900` 的實測影響

站上 CSS 有 34 條 `font-weight: 800`，但 Google Fonts 只請求 400/500/700/900，
且實測確認載入的是**靜態字重 face**（無可變字型、無 800 face）。
依 CSS 字型匹配規則，`800` 原本就已被解析為 `900`。

改動前後量測所有 computed weight 為 800／900 的元素寬度：

| 文字 | 改動前 (800) | 改動後 (900) |
|---|---|---|
| 跳到主要內容 | 124.19 | 124.19 ✅ |
| 官方資料整理・工具化・可回報修正 | 289.82 | 289.82 ✅ |
| 官方來源可回查 | 98.56 | 98.56 ✅ |
| 風險先揭露 | 89.19 | 89.19 ✅ |
| 公開內容免費 | 103.28 | 103.28 ✅ |
| 資料性質說清楚 | 117.35 | 117.35 ✅ |
| **01**（拉丁數字） | 15.63 | **14.88** ⚠️ −0.75 px |

**結論**：所有中文文字**逐像素相同**，證實 800 本來就等於 900。
唯一差異是拉丁數字與英文字母——那些走系統字型
（`-apple-system` / Segoe UI 等有真實可變字重），800 與 900 確有區別。
受影響的是旅程階段編號「01」–「04」這類短標籤，寬度約差 5%。

**為何選擇改 CSS 而非補請求 800**：補一個 CJK 字重會讓已達 198 KB 的
render-blocking stylesheet 再增約 33 KB，
而那正是目前 LCP 的最大瓶頸。為了拉丁數字的 0.75 px 付這個代價不划算。
若日後判定該差異不可接受，**單一指令即可回復**：
把 `assets/style.css` 的 `font-weight: 900` 改回 `800`（但請保留本節結論）。

---

## 0. 這份規格的前提與誠實界線

1. **今天沒有任何分析數據。** `assets/analytics-config.js` 的 `measurementId` 為空字串，
   D+ 後端未部署。因此本文件中所有「留存」與「停留時間」的因果主張
   **都是假設，不是已驗證的結果**。每一項都標註了驗證條件。
2. **效能與無障礙的數字是實測的**，不是估計。量測條件記於 §1.0。
3. 本文件**不授權刪除任何既有功能**。理由見 §4「明確不做的事」。
4. 所有內容類改動仍受 SDD §1.1 拘束：不得提供個案簽證、法律、稅務或醫療建議；
   每個重要數字附官方來源與查核日期。
5. **量測前置已更新**：站長 2026-09-02 決定 Cloudflare Web Analytics 與同意制 GA4 並用
   （`DECISIONS.md` D-2026-09-02-01）；本文件 C.1 所述「填入 GA4 Measurement ID」仍受 SPEC §1.5
   敏感頁排除與 P0-3 人工前置約束，`analytics.js` 目前未排除敏感頁，排除完成前不得填 ID。

---

# A. 技術修復

## 1.0 量測基準（所有效能驗收都用這組條件）

| 項目 | 設定 |
|---|---|
| 工具 | Chrome DevTools Performance trace（navigation，autoStop） |
| 網路 | Slow 4G |
| CPU | 4x slowdown |
| 視窗 | 390 × 844，devicePixelRatio 3，mobile + touch |
| 頁面 | `http://127.0.0.1:4175/index.html`（本機靜態伺服器） |
| 無障礙 | Lighthouse，mode=navigation，device=mobile |

### 量測雜訊（**先讀這段，否則會做出錯誤的驗收判斷**）

在 commit `cb23ed0` 上連續量測 3 次，同一組節流設定、同一頁面：

| 次數 | LCP | LCP 元素 nodeId |
|---|---|---|
| 1 | 2,803 ms | 157 |
| 2 | 2,566 ms | 159 |
| 3 | 2,069 ms | 117 |
| **中位數** | **2,566 ms** | — |
| **全距** | **734 ms（達中位數的 35%）** | — |

兩個結論：

1. **單次 LCP 量測不足以判斷任何改動的成效。** 初版規格記錄的 2,469 ms 是單次值，
   落在本次全距內，**不能據以宣稱 `cb23ed0` 造成效能回歸，也不能宣稱沒有**。
2. **LCP 候選元素本身在三次之間都不同**（nodeId 157／159／117），
   高度懷疑與 CJK 網頁字型 `display=swap` 的換字時機有關。
   這使得跨版本比較更不可靠。

**因此所有效能驗收一律採「連續 5 次取中位數」，並同時記錄全距。**
若全距 > 中位數的 25%，該次量測作廢重跑；
改動前後的中位數差異必須大於改動前的全距，才可宣稱有效。

**2026-09-01 基線實測值（commit `cb23ed0`）**

| 指標 | 實測 |
|---|---|
| LCP | **中位數 2,566 ms**（3 次；全距 2,069–2,803；render delay 佔 >99%） |
| CLS | 0.00（三次一致） |
| DOM 元素數 | 675 |
| Lighthouse Accessibility（`index.html`） | 93 |
| Lighthouse Accessibility（`lang/en/visa/`） | 93 |
| Lighthouse Accessibility（`market.html`，新頁） | 93 |
| Lighthouse Best Practices／SEO／Agentic | 100／100／100 |
| Console 錯誤 | 0 |
| `scripts/check.ps1` | **ALL CHECKS PASSED (15 pages)** |
| Worker 測試 | 7 檔／27 測試全過 |
| `npm audit` | 0 vulnerabilities |

> 重新量測時必須沿用同一組節流設定，否則數值不可比較。
> 基線本身只有 3 次，低於上述要求的 5 次；實作 P0-5 前應先補足一組 5 次基線。

---

## A.0 官方數字正確性查核（2026-09-01 獨立查證）

這是簽證與勞動法內容，過期數字會直接害到讀者，因此優先級最高。
本輪對站上四項承重數字做了**獨立於站方查核紀錄**的驗證：

| 站上數字 | 位置 | 查證結果 | 依據 |
|---|---|---|---|
| 國家最低時薪 **A$26.44**／週薪 $1,004.90（38h） | `cost.html` | ✅ **正確** | 2026 年度工資裁決：NMW 調升 6%、modern award 調升 4.75%，2026-07-01 生效 |
| Casual 最低時薪 **A$33.05**（含 25% loading） | `cost.html` | ✅ **正確**（26.44 × 1.25 = 33.05） | 同上 |
| WHM 稅率 **15% 至 $45,000** | `cost.html`／`leave.html` | ✅ **正確**（2026-27 適用） | ATO working holiday maker 稅率表 |
| 退休金提繳率 **12%** | 多頁 | ✅ **正確**（2026-07-01 起維持 12%） | ATO Super Guarantee |
| DASP WHM 稅率 **65%** | `leave.html` | ✅ **正確** | 站上已標註為現行法定稅率並附官方入口 |

**查核來源**
- <https://www.fairwork.gov.au/about-us/workplace-laws/annual-wage-review/annual-wage-review-2026>
- <https://www.fwc.gov.au/hearings-decisions/major-cases/annual-wage-reviews/annual-wage-review-2026>
- <https://www.ato.gov.au/tax-rates-and-codes/tax-rates-working-holiday-makers>

**站上查核日期分布**（全部在 2026-07-01 數字變動月之後，無過期）

| 標記 | 筆數 |
|---|---|
| `updated-tag` 2026-08 / 08-30 / 08-31 / 09-01 | 5 / 4 / 1 / 1 |
| `fact-meta` 2026-08-28 | 21 |
| `fact-meta` 2026-08-30 | 23 |
| `fact-meta` 2026-08-31 / 09-01 | 2 / 3 |

**值得記錄的正面發現**：`cost.html` 不只給單一數字，還分開列出
NMW 地板、casual loading、園藝業入門級 $32.18 與餐飲業，
並明確導向官方 P.A.C.T. 計算器查個人精確級距。
**這是本次查核中處理得最好的一段內容**，可作為其他數字的範本。

**下次查核窗**：2027-07-01（SPEC §7 年度維護窗）。
上述五項全部會在該日變動，屆時必須同步更新
`cost.html`、`leave.html` 與 `scripts/check.ps1` 的試算器基準值
（目前基準：33.05 × 38h → gross week $1,256）。

---

## P0-5 五支腳本 render-blocking

### 現況
`index.html` 等 15 頁根層頁面（含新增的 `market.html`），以及 `lang/` 底下各頁，
所有 `<script src>` 皆無 `defer`。
雖然標籤位於 `</body>` 之前，Performance trace 顯示五支全部標記 `renderBlocking: t`：

| 檔案 | 主執行緒處理時間（4x CPU） |
|---|---|
| `assets/analytics-config.js` | ~201 ms |
| `assets/analytics.js` | ~202 ms |
| `assets/i18n.js` | ~202 ms |
| `assets/api-config.js` | ~202 ms |
| `assets/main.js` | ~202 ms |

合計約 1.0 秒。相對於 render delay 中位數（約 2,560 ms）約佔四成，
但**這個比例本身受量測雜訊影響，不應作為驗收依據**——
本項的可靠依據是「這五支被標記為 render-blocking」這個二元事實。

### 目標
- **主要門檻（客觀、不受雜訊影響）**：RenderBlocking insight 中不再出現任何 `.js` 請求。
  這是二元判定，不需要統計。
- **次要門檻（參考）**：LCP 中位數（5 次）較改動前中位數下降，
  且降幅大於改動前的全距（目前 734 ms）。
- CLS 維持 0.00。

> **為什麼不再用「LCP ≤ 1,800 ms」當門檻**：見 §1.0 量測雜訊。
> 目前全距 734 ms，單一絕對門檻會被雜訊主導。
> 以「render-blocking 請求歸零」作為主門檻，才是這項改動真正能保證的結果。

### 實作方式
在 `src` 屬性**之後**加入 `defer`：

```html
<script src="assets/analytics-config.js?v=20260901-43" defer></script>
```

**必須同步修改的產生器**：`scripts/build_i18n.py:159-161` 會重新產生
`lang/**` 的腳本標籤，未一併修改則下次 build 會被覆蓋。

**為什麼 `defer` 而非 `async`**：五支有嚴格順序依賴
（`analytics-config.js` 定義 `window.WHV_ANALYTICS_CONFIG` 供 `analytics.js` 讀取；
`api-config.js` 定義 `window.WHV_API_CONFIG` 供 `main.js` 讀取）。
`defer` 保證依文件順序執行且在 `DOMContentLoaded` 之前完成，`async` 不保證。

### 驗收條件
1. **RenderBlocking insight 中不再出現任何 `.js` 請求**（主門檻，二元判定）。
2. 改動前後各跑 5 次取中位數，CLS 三次以上為 0.00；LCP 中位數不上升。
3. `scripts/check.ps1` 仍 **ALL CHECKS PASSED (15 pages)**。
4. 手動開啟 `index.html`、`visa.html`、`cost.html`、`prep.html`、`about.html`、
   `simulator.html`、**`market.html`** 與 `lang/en/visa/`，Console 0 錯誤，
   搜尋鈕、語言切換、集簽快查、存錢試算、行前清單、需求單、
   **離澳出清草稿產生器**皆正常。

### 風險與破壞性影響
- **低。** 已確認全站無任何依賴這些全域變數的 inline `<script>`
  （只有 `application/ld+json`，不執行）。
- `check.ps1:425-428, 573-574, 1051-1052, 2170` 使用
  `<script src="assets/xxx.js?v=` 前綴比對與相對順序檢查；
  `defer` 加在 `src` 之後**不影響**該前綴與順序，已確認相容。
- 若未來新增依賴 `window.WHV_*` 的 inline script，必須改為 `defer` 或移入外部檔案。

---

## P0-6 無障礙倒退三項

> **定位**：SDD §4.5 已明文規定「主色與文字連結過 AA；inline link 持續顯示底線，
> 不只靠顏色辨識」。以下第 (2) 項與第 (3) 項是**對照專案自身既有基線的倒退**，
> 不是新需求。§4.5 標題即為「不得倒退」。

### (1) `.language-go` 深色模式對比 1.43:1

**現況** — `assets/style.css:350-361`（`background` 在 :355、`color` 在 **:356**）
```css
.language-go { background: var(--gold); color: var(--ink); }
```
深色模式下 `--ink` 為 `#f3f1e7`（淺色），疊在 `--gold: #efc74e` 上，
實測對比 **1.43:1**（WCAG AA 需 4.5:1）。此按鈕存在於**每一頁**的 header，
複查已確認新頁 `market.html` 同樣命中。

**目標** — 淺色與深色兩種主題皆 ≥ 4.5:1。

**實作方式** — 改用既有 token：
```css
.language-go { background: var(--gold); color: var(--on-gold); }
```
`--on-gold` 已定義（淺色 `#27342e`／深色 `#1d2925`，`style.css:19` 與 `:61`），
且 `.updated-tag` 已正確使用同一組合。深色模式改後約 10:1。
**不新增 token，不改動配色系統。**

**驗收條件** — Lighthouse `color-contrast` audit 在 `index.html` 與
`lang/en/visa/` 皆通過；淺色／深色兩種 `prefers-color-scheme` 下目視確認。

**風險** — 極低。單一屬性值置換，token 已存在且語意正確。

### (2) `.note / .warn / .tip` 內連結只靠顏色辨識

**現況** — `assets/style.css:98` 全站 `a { text-decoration: none; }`。
深色模式下連結色 `--link: #f0cf70` 對周圍內文 `--ink: #f3f1e7` 僅 **1.33:1**
（WCAG 1.4.1 要求非文字對比 3:1，或以底線等非顏色方式區辨）。
Lighthouse 在中文首頁的 `.warn`（防詐頁、簽證頁連結）與英文 visa 頁的
`.tip` / `.note`（Home Affairs guidance、OMARA register）皆命中。

**影響範圍**：全站警告框、提示框、注意框。這些正是承載官方來源與安全出口的區塊。

**目標** — 提示框內連結不依賴顏色即可辨識；符合 SDD §4.5。

**實作方式**
```css
.note a, .warn a, .tip a {
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 2px;
}
```

**範圍決策**：本次**只修提示框**，不全站改 `a`。理由：全站加底線會改變首頁卡片、
旅程導覽、支援入口等大量以 `.card` / `.chip` 形式呈現的連結外觀，屬設計變更而非缺陷修復。
提示框內連結是**內文中的行內連結**，正是 SDD §4.5 所指的 inline link。
若日後要處理內文段落 `<p>` 中的行內連結，另立項目並先做視覺審查。

**驗收條件** — Lighthouse `link-in-text-block` audit 在 `index.html` 與
`lang/en/visa/` 皆通過。

**風險** — 低。純視覺增加，不改變版面高度（`text-underline-offset` 不影響 line-box）。

### (3) 可見文字與無障礙名稱不符（WCAG 2.5.3）

**現況** — 兩處，語音控制使用者念出可見文字時無法觸發：

| 位置 | 可見文字 | 目前 aria-label | 問題 |
|---|---|---|---|
| `assets/i18n.js:30` | `Go` | `Open selected language` | 完全不含 "Go" |
| `assets/main.js:675` | `留下一句感謝（公開於 GitHub）` | `前往 GitHub 公開留下一句感謝（另開新頁）` | 可見字串非其子字串 |

（已確認 `.saved-page-remove` 的「移除」與 `#fb-save` 的「收藏這頁」皆通過，無需改動。）

**目標** — 無障礙名稱以可見文字**開頭**，補充說明接在後面。

**實作方式**
- `i18n.js`：`go.setAttribute("aria-label", "Go — open selected language");`
- `main.js`：`aria-label="留下一句感謝（公開於 GitHub）；另開新頁"`

**驗收條件** — Lighthouse `label-content-name-mismatch` audit 通過。

**風險** — 極低。純字串調整。

### P0-6 整體驗收
- Lighthouse Accessibility 分數：`index.html`、`lang/en/visa/`
  與 **`market.html`** 皆 **≥ 98**（三者基線均為 93）。
- Best Practices／SEO／Agentic 維持 100。
- `scripts/check.ps1` 仍 ALL CHECKS PASSED (15 pages)。

### P0-6 已通過複查、無需改動的項目（記錄下來避免重複稽核）

對照 SDD §4.5「無障礙基線（不得倒退）」逐條檢查，以下**全部符合**：

| §4.5 條款 | 複查結果 |
|---|---|
| `:focus-visible` 焦點環全站可見 | ✅ `style.css` 中 8 條規則 |
| 全域 `prefers-reduced-motion` | ✅ `style.css:2857-2866`，涵蓋 `*`／`*::before`／`*::after`，並含 `scroll-behavior: auto !important`（正確覆蓋 `:70` 的 `scroll-behavior: smooth`） |
| 錨點保留 sticky header 安全距離 | ✅ 5 條 `scroll-margin` 規則 |
| skip link 由靜態 HTML 提供、不依賴 JS | ✅ 16 個根層 HTML 檔全數具備 |
| `main#main-content[tabindex="-1"]` | ✅ 16 檔全數具備 |
| `aria-current="page"` | ✅ 15 頁具備（`404.html` 除外，屬預期） |
| 觸控目標尺寸 | ✅ `.language-go` 已宣告 `min-width/height: 44px` |

因此 P0-6 的範圍**僅限**上述三項，不需擴大。

---

## P2-3 手機捲動繪製成本（**未經隔離量測，不得列為已知缺陷**）

### 現況
DOM 僅 675 元素，但 trace 記錄到多次高成本 layout 更新
（1,916 ms／527 節點、1,945 ms／862 節點、1,424 ms／849 節點，4x CPU 下）。
複查後，候選成本來源從三項**修正為兩項**：

| 位置 | 內容 | 手機（≤640px）是否生效 |
|---|---|---|
| `style.css:88-96` | `body::after` 全視窗 `position: fixed` 的 `feTurbulence` 分形雜訊層，z-index 999 | ✅ 生效 |
| `style.css:182` | sticky header 上的 `backdrop-filter: blur(14px)` | ✅ 生效 |
| ~~`style.css:79`~~ | ~~`background-attachment: fixed`~~ | ❌ **不生效，已從本項移除** |

**第三項為何移除**：`style.css:2771` 位於 `@media (max-width: 640px)`（區塊起於 `:2734`），
已將 `body` 的 `background-attachment` 改回 `scroll`。
量測視窗為 390 px，因此 `fixed` 在手機上**從未生效**。
初版規格把它列為行動端捲動成本來源是**錯誤的**，
該屬性只影響 >640px 的平板與桌機。

### 誠實揭露
2026-09-01 曾嘗試以注入 CSS 做 A/B，但注入時機在 `DOMContentLoaded`，
首次繪製仍使用原 CSS，**實驗無效**（LCP 反而 2,837 ms 且產生 CLS）。
因此剩下兩項目前仍是**基於機制的假設，不是已驗證的成本來源**。

**複查追加的疑點**：三次量測中 LCP 元素的 nodeId 各不相同（157／159／117），
顯示 LCP 候選不穩定。在調查上述兩項之前，
應先確認這是否由 CJK 網頁字型 `display=swap` 的換字時機造成——
若是，字型策略（見 P2-4）才是更該優先處理的對象。

### 目標
先取得可信量測，再決定是否改動。**不得在未量測前為了效能犧牲既有視覺設計**
（「簡約檸檬布紋」是 SDD §4 的設計系統，不是裝飾）。

### 實作方式（僅量測，不改設計）
1. 建立**兩個**暫時性 CSS 變體檔（各關閉一項），以 `<link>` 直接替換 `style.css` 重新 trace。
   變體必須在**首次繪製前**生效（直接改檔或換 `<link>`），
   不得用 JS 注入——初版就是栽在這裡。
2. 每個變體跑 **5 次取中位數**並記錄全距（依 §1.0 修訂後的規則）。
3. **判定門檻**：單項的中位數改善必須 **大於基線全距（目前 734 ms）** 才算有效，
   並且必須提出**保留視覺意圖**的替代做法
   （例如雜訊層改為靜態 PNG dataURI、`backdrop-filter` 僅在 `min-width: 641px` 啟用）。

### 驗收條件
產出一份量測紀錄附於本文件，含兩個變體各 5 次的數值與全距。**本項不含程式碼改動。**

### 風險
高破壞性風險——這兩項都是設計系統的一部分。任何改動需依 SDD §7「品質協議」
走一輪反方審查。

---

## P2-4 CJK 網頁字型載入策略（複查新增）

### 現況
每頁 `<head>` 以 render-blocking `<link rel="stylesheet">` 載入 Google Fonts：

```
Noto+Sans+TC:wght@400;500;700;900 + Noto+Serif+TC:wght@700;900
```

即 **6 個 CJK 字重**。CJK 字型每個字重都是被切成上百個 unicode-range 子集的大型家族，
是全站最重的第三方資源。已有 `display=swap` 與 `preconnect`（做法正確）。

**複查發現的不一致**：CSS 實際使用的 `font-weight` 值為 **500 / 700 / 800 / 900**
（外加未宣告的預設 400）。其中 **`800` 並未向 Google Fonts 請求**，
瀏覽器會依 CSS 字型匹配退到 900（或合成），
所以宣告 800 的元素拿到的**不是**設計者以為的字重。

### 目標
在不改變視覺層級的前提下減少 CJK 字型位元組，並消除 800 這個未被請求的字重。

### 實作方式（提案，需視覺審查）
1. 把 CSS 中的 `font-weight: 800` 統一改為 `700` 或 `900`（擇一），使宣告與請求一致。
2. 評估能否把 Sans 從 4 字重減到 3（例如移除 500 或 900），Serif 從 2 減到 1。
3. 量測改動前後的字型位元組與 LCP 中位數（5 次）。

### 驗收條件
- 字型請求字重數下降，且 CSS 中不再出現未被請求的字重。
- LCP 中位數不上升；目視確認標題層級與強調未走樣。

### 風險
**視覺風險中等**——字重是設計系統 §4.2 的一部分，
減字重會改變標題與強調的視覺層級。需目視審查與 SDD §7 反方審查。
**本項不得與 P0-5 同批出貨**，否則無法歸因。

---

# B. 留存機制重建

## P1-15 iOS ITP 儲存壽命限制（**這是本規格最重要的一項**）

### 現況：一個未被記錄的平台限制

Safari 自 **iOS 13.4 / Safari 13.1** 起，在
**「7 天的 Safari 使用期間內未與該網站互動」**後，刪除該站全部
script-writable storage，包含 `localStorage`、`sessionStorage`、IndexedDB、
Media keys 與 Service Worker registrations。

- 官方來源：<https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/>
  ｜2026-09-01 查核
- 精確語意：計時單位是**瀏覽器使用天數**，不是日曆天。
- **豁免**：加入主畫面的網頁 App 不屬於 Safari，有獨立計時器。

### 受影響的既有功能（全部依賴 `localStorage`）

> 行號已於 2026-09-01 第二輪複查對照 commit `cb23ed0` 重新驗證。

| 功能 | 儲存鍵 / 位置 | iOS 沉默後 |
|---|---|---|
| 我的收藏 | `whv-saved-pages-v1`（`main.js:461`） | 清空 |
| 接續上次閱讀 | `whv-last-page-v1`（`main.js:440`） | 清空 |
| 21 項行前清單 | `tools.js:438` | 清空 |
| 存錢試算輸入 | `tools.js:290` | 清空 |
| DASP 試算輸入 | `tools.js:1292` | 清空 |
| 自我釐清工作表 | `whv-worksheet-v1`（`main.js:1449`） | 清空 |
| GA4 同意選擇 | `whv-analytics-consent-v1`（`analytics.js:8`） | 清空 → 重新詢問 |
| 模擬器進度 | `sessionStorage`（`simulator.js:280`） | 本來就是單分頁，不受額外影響 |

### 為什麼這對本站特別致命
本站族群的使用節奏是「爆發 → 沉默數月 → 再爆發」（見 §B 前言）。
**沉默期正是這整層機制要跨越的東西，而在 iOS 上它跨不過去。**

### 目標
1. 把這個限制寫進 SDD §6「重要教訓」，避免後續開發者再把長週期狀態押在 Web Storage。
2. 所有**跨月以上**的留存需求改用不依賴瀏覽器儲存的載體（見 P1-16）。
3. 既有的**單次會話內**與**短週期**功能維持不變，並優雅降級。

### 實作方式
- **不刪除**任何既有 localStorage 功能（見 §4）。
- 每個依賴儲存的區塊，在儲存讀取為空時，必須呈現有意義的預設狀態而非空白或錯誤。
  （現況：`readSavedPages()` 與工作表讀取已有 `try/catch` 降級，行為正確；
  `main.js:568` 的 `resume` 區塊需修正，見下方風險段。）
- 於 `about.html` 的隱私／資料說明段落，誠實記載此限制與「加入主畫面」對策。

### 驗收條件
1. SDD §6 新增一條教訓，附 WebKit 來源連結與查核日期。
2. 在 iOS Safari（或 macOS Safari 開啟「Prevent cross-site tracking」）清除網站資料後，
   逐一開啟首頁、`prep.html`、`cost.html`、`leave.html`、`why.html`，
   五頁皆正常顯示初始狀態，Console 0 錯誤，無空白區塊。
3. `about.html` 可查到此限制的說明。

### 風險與破壞性影響
- 無程式行為破壞性改動。
- **附帶修正**：`main.js:568` 的 `catch` 在 `#journey-resume-link` 等 DOM 元素缺失時，
  會連帶 `localStorage.removeItem(LAST_PAGE_KEY)`，把 DOM 問題轉成使用者資料損失。
  應將 JSON 解析錯誤與 DOM 缺失分開處理，只有前者才清除。

---

## P1-16 `.ics` 行事曆匯出（取代以 localStorage 追蹤年度待辦）

### 現況
站上沒有任何跨越數月的提醒機制。`prep.html` 的 21 項清單只涵蓋出發前，
落地後的不可逆事項（TFN、super、稅年、離澳前 DASP）沒有任何承載。

### 目標
產出一個使用者可下載、匯入自己行事曆的 `.ics` 檔。
**不需後端、不需帳號、換手機不會遺失、不受 ITP 影響、本站不持有任何資料。**

### 涵蓋事件（固定四項，不可由使用者自由新增文字）

| # | 事件 | 錨點 | 預設提醒 |
|---|---|---|---|
| 1 | 申請 TFN（稅號） | 使用者輸入的抵澳日 + 7 天 | 前 3 天 |
| 2 | 確認 super 基金與雇主提繳 | 抵澳日 + 30 天 | 前 7 天 |
| 3 | 澳洲稅年結束（6/30）與報稅期開始（7/1） | 抵澳日之後的第一個 6/30，產生兩年份 | 前 14 天 |
| 4 | 離澳前處理 DASP | 使用者輸入的**離澳日** − 14 天 | 前 7 天 |

**合規約束（不可放寬）**
- 事件 4 的錨點**必須是使用者自行輸入的離澳日**，
  **不得**由簽證到期日推算，也不得儲存或推算簽證到期日。
- **不得**產生任何與「88 天／specified work／第二年資格」相關的計數或事件。
  這是使用者最想要的功能，也正是最明確違反 SDD §1.1 的功能。
- 每個事件 `DESCRIPTION` 必須包含：官方來源 URL、查核日期，以及固定句
  「這是你自己的備忘，不是資格審查；本站不判斷個案。」

### 檔案產生方式
- 純前端。沿用站上既有模式：組出字串 → `new Blob([...], { type: "text/calendar;charset=utf-8" })`
  → `URL.createObjectURL` → `<a download>` → `URL.revokeObjectURL`。
  參考既有實作 `main.js:1500-1504`（工作表文字匯出）與
  `tools.js:708-709`（海報 PNG，已正確 revoke）。
- 新檔 `assets/calendar.js`，於 `leave.html` 與 `prep.html` 掛載。
- 輸入 UI：兩個 `<input type="date">`（抵澳日、離澳日），皆非必填；
  只填抵澳日 → 產生事件 1-3；只填離澳日 → 產生事件 4。
- **不寫入 localStorage**（避免再造一個會被 ITP 清掉的狀態）。

### iCalendar 格式規格（RFC 5545）

| 項目 | 規格 |
|---|---|
| 換行 | **CRLF**（`\r\n`），非 LF |
| 折行 | 每行 ≤ 75 octets，續行以 CRLF + 單一空格開頭。**中文須以 octet 而非字元計數折行** |
| `PRODID` | `-//Aussie WHV Compass//WHV Reminders//ZH-TW` |
| `VERSION` | `2.0` |
| `CALSCALE` | `GREGORIAN` |
| `METHOD` | **`PUBLISH`**（複查補上）——標示為發布而非邀請，Outlook 匯入行為較穩定 |
| `X-WR-CALNAME` | `澳打指南針提醒`（複查補上，匯入後的行事曆名稱） |
| 日期型別 | **全日事件** `DTSTART;VALUE=DATE:YYYYMMDD` |
| `DTEND` | **`DTEND;VALUE=DATE:` = DTSTART + 1 天**（複查補上，**排他性**） |
| 時區 | **不輸出 `VTIMEZONE`** |
| `UID` | `whv-<slug>-<YYYYMMDD>@aussiewhvcompass.com` |
| `SEQUENCE` | 預設 `0`；**若同一 UID 的內容變更，必須遞增**（複查修正） |
| `DTSTAMP` | 產生當下的 UTC，格式 `YYYYMMDDTHHMMSSZ` |
| 提醒 | `VALARM` + `ACTION:DISPLAY` + `DESCRIPTION` + `TRIGGER:-P3D` / `-P7D` / `-P14D`，**置於 VEVENT 末端** |
| 文字跳脫 | TEXT 值中的 `\` `;` `,` 依序跳脫為 `\\` `\;` `\,`；換行寫成 `\n` |

**為什麼用全日事件而不輸出時區**：使用者可能在澳洲八個州領地任一處，
或尚未出發仍在原居地。全日事件（`VALUE=DATE`）不帶時間，
不需要 `VTIMEZONE` 區塊，也不會因為時區換算把 6/30 推成 6/29。
這同時避免了本站去猜測使用者所在時區。

**`DTEND` 為排他性（複查補上，這是最容易踩的錯）**：全日事件的 `DTEND`
指向**結束的隔天**。6/30 當天的事件必須寫
`DTSTART;VALUE=DATE:20270630` 搭配 `DTEND;VALUE=DATE:20270701`。
寫成 `20270630` 會讓部分客戶端顯示成零長度或退到前一天。
RFC 5545 允許只給 `DTSTART`（預設一天），但實務上多個客戶端在缺 `DTEND` 時行為不一，
因此**一律明寫**。

### 跨客戶端行為差異（複查新增，**這節推翻了初版的一項驗收門檻**）

初版寫「同一組輸入重複匯出並重複匯入，**不產生重複事件**」並列為驗收門檻。
複查後判定**這個保證在跨客戶端層級不成立**：

| 客戶端 | UID 去重 | `VALARM` 提醒 |
|---|---|---|
| Google 日曆 | 大致依 UID 去重 | **不可靠**——匯入時常以使用者的預設通知設定取代檔內提醒 |
| iOS／macOS 日曆 | **不保證**，匯入常直接新增 | 一般會沿用檔內 `VALARM` |
| Outlook（桌機／網頁） | **不保證**，「從檔案匯入」傾向全部新增 | 已知對 `VALARM` 位置敏感，放在 VEVENT 末端較穩 |

**因應**
1. 驗收改為**逐客戶端記錄實際行為**，不再作為通過／失敗門檻。
2. 匯出 UI 必須明白告知：
   「重複匯入可能在部分行事曆產生重複事件；若要重新匯入，請先刪除舊的。」
3. 提醒功能定位為 **best-effort**，文案不得承諾「一定會提醒你」。
   事件本身出現在行事曆上是主要價值，提醒是附加。

**相對 `TRIGGER` 在全日事件上的落點**：`-P7D` 在多數客戶端會落在該日
當地時間 00:00。若要落在較友善的時刻需改用 `-P6DT15H` 之類的寫法，
但那會把時間語意帶回來。**本規格選擇維持單純的 `-PnD`**，
並在 UI 說明提醒時間由使用者的行事曆決定。

### 未解的可行性風險（**實作前必須先在實機確認**）

**iOS Safari 是否能可靠下載 blob 產生的 `.ics`，本輪查證未能確認。**
這件事很關鍵：`.ics` 方案存在的理由就是服務被 ITP 清空的 iOS 使用者，
但下載機制的可靠度**恰好在 iOS 上最不確定**。

實作前必須在實機依序驗證，取第一個可行者：
1. `<a download>` + `URL.createObjectURL(blob)`（與站上既有海報／工作表匯出同機制）
2. `<a>` + `data:text/calendar;charset=utf-8,<encodeURIComponent(...)>`
3. 直接以 `text/calendar` MIME 開新分頁，讓 iOS 接手「加入行事曆」流程

**若三者在 iOS Safari 皆不可靠，P1-16 必須重新設計或降級**，
不得在未驗證的情況下當成 ITP 問題的解方出貨。

**無套件相依**（複查確認）：純字串組裝 + `Blob`，
不需要任何 npm 套件，符合 SDD §1.1「公開內容無框架、無建置步驟」。
`worker/` 的 devDependencies 完全不受影響。

### 檔名慣例
- 主要：`澳打指南針-我的澳洲提醒-YYYYMMDD.ics`（`YYYYMMDD` 為產生日）
- 英文頁（`lang/en/**`）：`aussie-whv-compass-reminders-YYYYMMDD.ics`
- 若 `download` 屬性的非 ASCII 檔名在目標瀏覽器失效，退回英文檔名，不阻擋下載。

### 驗收條件（複查修訂）
1. **前置門檻**：iOS Safari 實機確認下載機制可行（見上方「未解的可行性風險」）。
   此項不通過則整項擱置。
2. 產出的 `.ics` 通過 RFC 5545 驗證（至少以 `ical.js` 或等效解析器解析無誤），
   且含 `METHOD`、`DTEND`、`X-WR-CALNAME`。
3. 實機匯入驗證：**iOS 日曆、Google 日曆、Outlook** 三者皆能匯入，
   事件標題、**日期落在正確的那一天**（驗證 `DTEND` 排他性沒有寫錯）、
   描述正確顯示，中文不亂碼。
4. **重複匯入行為逐客戶端記錄於本文件**（不是通過／失敗門檻）；
   UI 已顯示重複匯入警語。
5. 提醒行為逐客戶端記錄；UI 文案未承諾提醒必定送達。
6. 事件 4 只在使用者輸入離澳日時出現。
7. 四個事件的 `DESCRIPTION` 皆含官方來源、查核日期與邊界句。
8. 全程無網路請求（DevTools Network 面板確認）。

### 風險與破壞性影響
- **合規風險（最高）**：一旦事件文案寫成「你該辦第二年了」即違反 SDD §1.1。
  所有文案須以「一般時程提醒」措辭，並走 SDD §7 反方審查一輪。
- **時效風險**：稅年日期與 DASP 規則若變動，`.ics` 已匯出的部分無法回收。
  因此 `DESCRIPTION` 必附查核日期與官方連結，讓使用者能自行回查。
- 新增 `assets/calendar.js` 需納入 `check.ps1` 的資產版本一致性檢查
  （同一 `?v=` 版本號）。

---

## P1-17 「加入主畫面」引導

### 現況
無任何相關引導，也無 `manifest.json`。

### 目標
讓 iOS 使用者在**知情**的前提下，用唯一有效的方式豁免 ITP 7 天清除。

### 實作方式
- **觸發條件（三者皆成立才顯示）**：
  1. 使用者已實際存過東西（收藏、清單勾選、或試算完成）
  2. 判定為 iOS Safari 且非 standalone（`navigator.standalone === false`）
  3. 使用者未曾關閉過此提示
- **文案必須說明真正原因**，不得只寫「加到主畫面更方便」。建議：
  > iPhone 的 Safari 會在你 7 天沒回來時，清掉這一頁幫你存的勾選與試算。
  > 加到主畫面就不會被清。（分享 → 加入主畫面）
- 新增最小 `manifest.json`（`name`／`short_name`／`start_url`／`display: standalone`／
  `theme_color`／`icons`）供 Android 使用；iOS 另需 `apple-touch-icon`。

### 已知限制（**必須誠實告知使用者，不可略過**）
iOS 主畫面網頁 App 使用**獨立的儲存區**，Safari 內既有的收藏與清單
**不會**自動帶過去。使用者加入主畫面後會看到初始狀態。

因應方式（擇一，實作前需決定）：
- **(建議)** 提示時機提早——在使用者投入大量勾選**之前**就出現。
- 提示文案明講「加入主畫面後會是全新的一份，目前 Safari 裡的紀錄會留在 Safari」。
- 提供 P1-16 的 `.ics` 與既有海報 PNG 匯出作為跨環境搬運路徑。

### 驗收條件
1. 實機 iOS Safari：未存過任何東西時**不顯示**；存過之後顯示；關閉後不再出現。
2. 桌面瀏覽器與 Android Chrome **不顯示** iOS 專屬文案。
3. Android Chrome 可正確讀取 `manifest.json`（Lighthouse PWA/Installability 檢查）。
4. 文案含上述獨立儲存區的誠實說明。
5. `check.ps1` 的 emoji 掃描（0 命中）與資產版本一致性仍通過。

### 風險
- 過早或過頻繁的提示會變成干擾，直接傷害信任。觸發條件從嚴。
- `navigator.standalone` 為非標準屬性，須做存在性檢查後再取值。

---

## P1-18 危機優先開頭（五個恐慌頁）

### 現況
`housing.html`、`work.html`、`scam.html`、`visa.html`、`leave.html` 皆以編輯導言開場。
以 `housing.html` 為例，讀者在 11 點沒地方住的情境下開啟，第一屏是文章引言。
同時 `main.js` 注入的旅程導覽會顯示「第 N / 12 頁」，在危機情境下傳達的是「你落後了」。

### 目標
五頁最上方提供一個 ≤ 1.5 KB、不依賴 JavaScript 的區塊，
讓讀者在第一屏內拿到「接下來兩小時」的可執行答案。

### 內容結構規格（五個固定欄位，順序不可調動）

```
<section class="crisis-head">
  1. <h2> 接下來兩小時                          ← 固定標題
  2. <ol> 3–5 個祈使句步驟，每句 ≤ 40 全形字
  3. 一個官方入口或號碼
     + <p class="fact-meta">來源：<a>名稱</a>｜YYYY-MM-DD 查核</p>
  4. 一個連到本頁「既有」工具的連結
  5. <p> 邊界句：本站不判斷個案，這是一般資訊
</section>
```

**各頁的第 4 項對應（只連既有工具，不新建）**

| 頁面 | 連向 |
|---|---|
| `housing.html` | 防詐測驗（押金情境） |
| `work.html` | 集簽郵遞區號快查／欠薪官方通報入口 |
| `scam.html` | 防詐測驗 |
| `visa.html` | 集簽郵遞區號快查 |
| `leave.html` | DASP 速算 |

### 實作方式
- **純靜態 HTML**，直接寫在各頁 `<h1>` 之後、第一個 `<section>` 之前。
- **不使用 `<details>`。** 已評估並否決：把危機答案摺疊起來違背這個區塊存在的目的。
- 樣式加在既有 `assets/style.css`，**不新增 JS 檔**。
- 每頁 inline 內容 ≤ 1.5 KB，確保在 `style.css` 與 `search-index.js` 之前即可讀。

### 驗收條件
1. 五頁在 390 px 寬、Slow 4G 下，第一屏（844 px 高）內可讀完整區塊，無需捲動。
2. 停用 JavaScript 後，五個區塊仍完整顯示且連結可用。
3. 每頁該區塊的 HTML 位元組數 ≤ 1,536。
4. 五個 `<h2>` 的 id 不與既有錨點衝突；`check.ps1` 的 id 唯一性檢查通過。
5. 每頁單一 `<h1>` 的規則不變，`check.ps1` ALL CHECKS PASSED。
6. Lighthouse Accessibility 不低於 P0-6 完成後的分數。

### 風險與破壞性影響
- **合規風險**：「接下來兩小時」極易滑向個案建議
  （「去警察局」「你一定拿得回押金」）。文案限於**模式與官方聯絡管道**，
  不對個案結果作任何預測。須走 SDD §7 反方審查。
- **維護風險**：這五個區塊含官方號碼與日期，**過期速度最快**。
  若無法承諾納入 SPEC §7 例行維護窗，**不要上線**。
  此為上線前置條件，不是上線後的待辦。
- 內容新增會改變 `search-index.js`，須重跑 `python scripts/build_search.py`。

---

## P1-19 「網傳 vs 官網」對照塊

### 現況
站上已有防詐測驗（互動式），但沒有針對**具體流傳說法**的逐條對照。

### 目標
把群組裡真正在傳的那一句，直接對上官方原文，讓讀者能拿去終結爭論。

### 內容結構規格

```
<div class="rumour-check">
  <p class="rumour-claim">   <span>網傳</span> 「……」        ← 引述實際流傳的句子
  <p class="rumour-official"><span>官網</span> 「……」        ← 官方原文引述
  <p class="fact-meta">來源：<a>官方頁名</a>｜YYYY-MM-DD 查核</p>
</div>
```

### 內容規則（不可放寬）
1. 「官網」一側**必須**引自 `.gov.au`（或官方指定機構），並附法規／頁面名稱。
2. 官方那一句**不得比網傳那一句弱**。若官方說法本身有條件或不確定，
   照實寫出條件，不做簡化。
3. **不得列出任何具名個人、雇主、仲介或社團**——延續站方「只講手法不列黑名單」原則。
4. 每頁 3–7 塊，360 px 寬可完整掃讀。
5. `pr.html` 與第二年相關條目，官方側必須明載「核發不受保證」。

### 建議首批條目
- 「做滿 88 天就一定有第二年」
- 「押金不退是行規」
- 「領現金不用報稅」
- 「PR 走這條比較快」
- 「super 不領就沒了」

### 實作方式
- 純 HTML + `assets/style.css` 的 CSS 樣式，**不新增 JS**。
- **不是測驗**——防詐測驗已存在，不得複製其互動形式。
- 每個條目登錄進 `content-status.json` 的證據欄位，納入回查排程。

### 驗收條件
1. 五個恐慌頁各 3–7 塊，全部通過 `check.ps1`。
2. 每一塊皆有官方連結與查核日期，格式符合 SPEC §0 的標註慣例。
3. 抽查三塊，人工開啟官方頁確認引文與現行內容一致（SDD §7「回放驗證」）。
4. 重跑 `python scripts/build_search.py` 更新索引後 `check.ps1` 通過。

### 風險
- **過期的對照塊是「有自信的錯誤資訊」**，比沒有更糟。同 P1-18，
  納入例行維護窗是上線前置條件。
- 官方頁擋爬蟲（SDD §6 教訓 1），回查須用真瀏覽器讀 DOM。

---

## P1-20 「你上次看過之後改了什麼」

### 現況
`content-status.json` 已為 14 頁各自記錄 `lastModified`（例：`"lastModified": "2026-08-31"`），
且已在每頁 `<head>` 以 `<link rel="alternate" type="application/json">` 宣告。
**這份新鮮度帳本目前沒有任何前端功能使用。**
首頁 14 個區塊中沒有任何一個呈現「更新了什麼」。

### 目標
給回訪者一個具體的、屬於他自己的回訪理由，同時**不製造衰敗感**。

### 實作方式

**儲存**
- 新鍵 `whv-page-seen-v1`，內容為 `{ "<白名單頁名>": "YYYY-MM-DD" }`。
- **沿用既有白名單政策**：只接受 `JOURNEY_PAGES` 內的頁名，
  不儲存標題、網址、查詢字串或任何使用者輸入。與 `whv-saved-pages-v1` 同一套約束。
- 每次開啟內容頁時寫入當日日期。

**資料來源**
- 由 `scripts/build_seo.py` 額外產生一個精簡對照檔
  `assets/freshness.js`（`window.WHV_FRESHNESS = { "visa.html": "2026-08-31", ... }`）。
- **不直接 fetch `content-status.json`**：該檔 27 KB，對 regional 3G 是不必要的成本，
  且其中大部分欄位與本功能無關。

**呈現（正面表述，不是衰敗警告）**
- 有紀錄且有差異 → 「你上次看過之後，這 N 頁更新了」＋ 頁名清單。
- **無紀錄**（新使用者，或 iOS 被 ITP 清空）→ 降級為
  「最近更新」，直接列出 `lastModified` 最新的 3 頁。
  此降級對所有人都有意義，**永遠不顯示錯誤或空白區塊**。

### 與 AGY 反方意見的處置
反方審查主張「本頁已逾期」的警告會被讀成「維護者棄坑」，把信任轉成跳出率。
**部分採納**：因此本規格**只做正向差異呈現，不做逾期警告**。
原提案中的「過期頁面軟性警告」在本規格中**不實作**，
待 GA4 上線後有跳出率數據再評估。

### 驗收條件
1. 首次造訪（無 localStorage）→ 顯示「最近更新」三頁，無錯誤、無空白。
2. 造訪 `visa.html` 後回首頁 → `whv-page-seen-v1` 含 `visa.html` 與當日日期。
3. 手動把某頁的 seen 日期改早 → 首頁正確列出該頁為「已更新」。
4. `assets/freshness.js` 由 `build_seo.py` 產生，與 `content-status.json` 的
   `lastModified` 完全一致（不得手改）。
5. 該檔 ≤ 2 KB；納入 `check.ps1` 資產版本一致性檢查。
6. localStorage 全部停用時，功能靜默降級，Console 0 錯誤。

### 風險與破壞性影響
- **iOS 上此功能的個人化效果大部分會失效**（P1-15），實際上多數 iOS 使用者
  看到的會是「最近更新」降級版。這是已知且可接受的，因為降級版本身有用。
- `build_seo.py` 新增產物，須同步更新 SPEC §6 驗收程序的資產清單。

---

# C. 共通事項

## 1. 相依關係與建議順序

```
人工前置（只有站長能做，agent 不得代辦 — SPEC §0）
  └─ 填入 GA4 Measurement ID（docs/MEASUREMENT_SETUP.md）
        └─ 解鎖：所有留存效果的事後驗證

第一波（可完全平行，彼此無相依）
  ├─ P0-5  五支腳本加 defer          （含 build_i18n.py:159-161）
  ├─ P0-6  無障礙三項                 （style.css / i18n.js / main.js）
  └─ P1-15 ITP 記錄 + resume catch 修正（SDD §6 / about.html / main.js:568）

第二波（相依於第一波完成並通過驗收）
  ├─ P1-16 .ics 匯出                  ← **先做 iOS Safari 下載機制實機驗證**
  │                                      不通過則整項擱置，不得硬上
  ├─ P1-17 加入主畫面引導              ← 相依 P1-15 的認知，程式獨立
  └─ P1-20 你上次看過之後改了什麼       ← 相依 build_seo.py 產出 freshness.js

第三波（內容工作，五頁重疊，建議同批處理）
  ├─ P1-18 危機優先開頭                ┐ 同五檔案，順序做
  └─ P1-19 網傳 vs 官網                ┘ 完成後一起重跑 build_search.py

不排期（先量測，且不得與 P0-5 同批出貨以免無法歸因）
  ├─ P2-3 手機捲動繪製成本（兩項，非三項）
  └─ P2-4 CJK 字型載入策略  ← 若證實 LCP 元素不穩定源自字型，此項應升級並優先於 P2-3
```

**複查追加的排序建議**：P2-4（字型）目前排在 P2，但
§1.0 觀察到的「LCP 候選元素三次都不同」若確認由字型 swap 造成，
它就是 LCP 不穩定的**根因**，應該在 P2-3 之前處理。
建議在第一波完成後，先花一次量測釐清這件事再定序。

**為什麼 P0-5／P0-6 排在所有留存工作之前**：
Slow 4G + 4x CPU 下 LCP 中位數 2,566 ms、深色模式 1.43:1 對比、官方來源連結看不出可點——
承受這些的正是本站要留住的那批人（regional 澳洲爛訊號、廉價 Android、深夜、高壓）。
**在他們讀到內容之前就已經跳出的話，任何內容策略都不會生效。**
效能與無障礙修復本身就是留存工作。

## 2. 明確不做的事（以下任一項出現在 PR 中即應退回）

| 不做 | 理由 |
|---|---|
| **不刪除「我的收藏」** (`whv-saved-pages-v1`) | 零分析數據下刪除既有留存機制是憑直覺開刀。反方審查明確判定此舉為 WRONG。需先有 GA4 或 D+ 的實際點擊基線。 |
| **不刪除「接續上次閱讀」** (`whv-last-page-v1`) | 同上。 |
| **不刪除「第 N / 12 頁」計數器** | 改為**依階段隱藏**：當使用者處於「已在澳洲／回程與延續」時不顯示。此為可逆的 CSS／條件渲染調整，不需要數據支持，且保留給「還在考慮」族群的定位價值。 |
| **不把財務金額放進 query URL** | `leave.html?super=8500` 會把使用者的退休金餘額寫進網址列。網址會進入瀏覽器歷史、被截圖、被貼進聊天室備份。郵遞區號與工作類型可入 URL；**金額不可**。 |
| **不做「已逾期」警告橫幅** | 反方審查判定會被讀成維護者棄坑，把信任轉為跳出。改以 P1-20 的正向差異呈現。待數據再評估。 |
| **不做 88 天／specified work 天數計數器** | 這是使用者最想要、也最明確違反 SDD §1.1 的功能。任何顯示「N / 88」或推算資格的介面一律不收。 |
| **不新增 JS 框架或建置步驟** | SDD §1.1。本規格所有項目皆可用純靜態達成。 |
| **不為效能先砍設計** | P2-3 三項在取得隔離量測前不得改動。 |

## 3. 未經驗證項目清單（誠實揭露）

| 項目 | 狀態 | 需要什麼才能判斷 |
|---|---|---|
| P1-16 `.ics` 是否真的帶來回訪 | **未驗證假設** | GA4 上線後，比較匯出過 `.ics` 的時段與其後 3–6 個月的回訪曲線 |
| P1-17 主畫面引導的接受率 | **未驗證假設** | 需新增聚合計數鍵；目前 7 個固定鍵無法涵蓋 |
| P1-18 危機開頭提升回訪（而非只是停留） | **未驗證假設**；反方審查判定為 WEAK，主張這是「單次高強度消費」，讀者截圖轉傳後不回訪 | GA4 的回訪者比例；若僅停留上升、回訪未動，反方意見成立 |
| P1-19 網傳對照塊的謠言週期回訪 | **未驗證假設** | `official_source_opened / route_opened` 比值是最接近的代理指標 |
| P1-20 正向差異呈現是否勝過逾期警告 | **未驗證** | 兩者都未上線，無比較基礎 |
| P2-3 兩項繪製成本 | **未量測**（2026-09-01 的 A/B 實驗設計失敗） | 依 P2-3 的量測程序取得兩變體各 5 次數值 |
| P1-16 iOS Safari 能否可靠下載 `.ics` | **未確認**——本輪查證未能取得結論 | 實機測試三種下載機制 |
| `.ics` 提醒與去重的實際行為 | **已知不一致**，但本站尚未實測 | 三客戶端實機匯入並記錄 |
| `cb23ed0` 是否造成效能回歸 | **無法判定**——改動前後皆只有單次或少量量測，範圍重疊 | 需要改動前後各 5 次中位數；此機會已錯過，不必回頭補 |

**現有 7 個聚合計數鍵無法觀測回訪。**
`route_opened`／`official_source_opened`／`task_test_started`／
`task_find_route_success_30s`／`task_evidence_understood`／
`task_help_route_correct`／`task_test_completed` 全部是單次行為計數。
若要以 D+ 觀測回訪，需在 `worker/src/repository.ts` 的 `METRIC_KEYS` 新增鍵
（例如 `returning_open`：僅在本機 `first_seen_at` 早於 7 天時 +1，
payload 仍只送固定字串，不含任何識別特徵）。
**但這在 iOS 上同樣受 ITP 影響會低估**——因此 GA4 仍是較可靠的第一步。

## 3.5 第二輪複查：已檢查且**不需處理**的面向（記錄下來避免重複稽核）

| 面向 | 複查結果 |
|---|---|
| **圖片最佳化／lazy-load** | **非問題。** 全站 15 頁只有 1 個 `<img>`（`prep.html:256` 的海報預覽，由 JS 填入 blob），沒有內容圖片，因此不存在未壓縮大圖或缺少 `loading="lazy"` 的問題。`assets/og-cover.png`(559 KB) 只作 OG 分享圖，不在頁面載入路徑上（仍建議壓縮，見 §4）。 |
| **CLS** | **非問題。** 三次量測皆 0.00。 |
| **SEO — canonical** | ✅ 15 頁各正好 1 個；`404.html` 無 canonical 屬正確（該頁應 noindex）。 |
| **SEO — 結構化資料** | ✅ 15 頁皆有 `application/ld+json`，`check.ps1:117-125` 已強制每頁唯一且可解析。 |
| **SEO — sitemap** | ✅ 51 個 URL，已含 `market.html`；`check.ps1` 驗證頁數一致性並通過。 |
| **SEO — hreflang** | ✅ 有英文版的頁面才掛 hreflang；`about/english/leave/pr/404` 無 hreflang 屬**正確**（這些頁沒有翻譯版本）。 |
| **SEO — 新頁註冊** | ✅ `market.html` 已登錄於 `sitemap.xml`、`content-status.json`、`llms.txt`、`third-party-register.json` 與 `check.ps1`。 |
| **無障礙 — SDD §4.5 全條款** | ✅ 除 P0-6 三項外全部符合，逐條結果見 P0-6 章節末表。 |
| **相依套件風險** | ✅ `npm audit` 0 vulnerabilities（`worker/`；公開站無相依）。 |

### 快取標頭：**平台限制，非缺陷**

Performance trace 的 `Cache` insight 會持續回報快取壽命問題。
**GitHub Pages 不允許自訂 HTTP 回應標頭**，因此
`Cache-Control` 無法調整。站方現行對策是資產版本查詢字串
（`?v=20260901-43`，由 `build_seo.py:18` 與 `build_i18n.py:19` 統一管理），
這是**該平台上正確且唯一可行的做法**。

- 不要為了這條 insight 去改任何東西。
- 只有在未來遷移到 Cloudflare Pages 或自有 CDN 時，此項才變成可處理。
- 若遷移，可設定不可變資產長快取 + HTML 短快取；屆時另立項目。

---

## 4. 本規格未涵蓋、但同日健檢發現的次要項目

| 項目 | 位置 | 建議 |
|---|---|---|
| `/api/metrics` 無 Origin 即放行 | `worker/src/cors.ts:22`、`index.ts:56` | 部署前要求 Origin 存在且在白名單內，否則匿名計數可被灌水，污染留存判斷依據 |
| `og-cover.png` 559 KB | `assets/og-cover.png` | 壓至 200 KB 以下 |
| `@types/node: "latest"` | `worker/package.json` | 釘住版本，恢復可重現建置 |
| `.codex-remote-attachments/` 未忽略 | `.gitignore` | 加入忽略清單 |
| 更正案件時 `delete_after` 重推 24 個月 | `worker/src/repository.ts` | 判斷題：若對外承諾是「建立後 24 個月」，措辭需與行為對齊 |
| **README 頁數過期**（複查新增） | `README.md` | 仍寫「共 12 頁」／「14 頁」，實際已 15 頁；`market.html` 未列入頁面表與工具清單 |
| **CSS 宣告了未被請求的字重 `800`**（複查新增） | `assets/style.css` | 見 P2-4 |

---

## 附錄：本規格的產生方式

- 技術基線：Chrome DevTools Performance trace 與 Lighthouse 實測（條件見 §1.0），
  逐檔審查 `assets/*.js`、`assets/style.css`、`worker/src/*.ts`。
- 產品提案：ai-orchestra 多方協作（2026-09-01）。
  Grok（受眾行為）／MiniMax（產品機制，首次派工失敗後重派）／
  AGY（反方審查）。Codex 因額度耗盡被 router 排除；
  Claude 因與主 session 同族不列為獨立審查。
- 所有外部模型提案皆逐條對照 repo 實檔驗證；
  重複既有功能者（階段追蹤器、新鮮度徽章、清單匯出）已駁回，未進入本規格。
- ITP 限制經 <https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/>
  獨立查核後才寫入。
