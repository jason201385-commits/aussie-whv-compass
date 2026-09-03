# 澳打指南針 — UX 友善度改善建議

> 建立日期 2026-09-03｜本文件是對 SDD.md 與 SPEC.md 的**建議增補**，
> 尚未合併進正式文件。每條標註建議歸屬（SDD／SPEC／ROADMAP），
> 站長決定後搬入對應文件並在 DECISIONS.md 登錄。

---

## A. 建議新增至 SDD.md 的條目

### A-1. 不可協商原則增補（建議加在 §1.1）

**11. 新手優先、急事優先**：首頁與導航必須讓第一次造訪的使用者在 10 秒內找到下一步；
緊急情境（受傷、被騙、簽證到期）必須有零打字、不滾動就能觸及的出口。
任何新增的頁面或工具不得讓首頁首屏的可操作選項超過 5 個（不含安全出口）。

**12. 資訊分層預設折疊**：單頁超過 8 個 section 時，次要內容必須以 `<details>` 或等價機制
預設收合，只露出標題與一句話摘要。不得讓使用者必須滾動超過 5 屏才能看到頁尾。

### A-2. 設計系統增補（建議加在 §4）

**閱讀進度條**：內容頁（排除 index、about、404）在 sticky header 下方顯示 2px 細線進度條，
顏色使用 `var(--accent)`，固定在 `top: header-height`。以 `scroll` 事件 + `requestAnimationFrame`
計算 `(scrollTop / (scrollHeight - clientHeight)) * 100`。不寫 storage、不觸發 reflow。

**updated-tag 徽章化**：現行 `.updated-tag` 改為 pill 樣式（`border-radius: 999px`、
`background: var(--green-soft)`、`padding: 2px 10px`、`font-size: .78rem`、`font-weight: 700`），
放在 section 標題右側而非段落內文。讓查核日期成為信任訊號而非背景雜訊。

**安全出口浮動按鈕**：新增 `.fab-emergency` 固定在右下角（`position: fixed; bottom: 20px; right: 20px`），
圓形 56px，只顯示「急？」二字 + `i-alert` 圖示。點擊展開 `#support-hub` 的 popover 版本
（不是全螢幕 section）。桌面版在 `#support-hub` 滾動進入視窗時自動隱藏 FAB。

**Section 白話摘要**：每個 `<section>` 的 `<h2>` 下方新增 `<p class="section-tldr">`，
一句話（≤30 字）說明這段在講什麼。例如：「這段告訴你：哪些工作可以算集簽天數。」
字體 `color: var(--ink-soft); font-size: .92rem; font-style: italic;`。

### A-3. 手機導航原則（建議加在 §4 或新增 §4.5）

- `.nav-links` 在 `<768px` 時預設只顯示前 4 個連結（why、visa、work、scam）+ 搜尋鈕 + 漢堡按鈕。
- 漢堡選單以 `<dialog>` 實作（不用 CSS-only hack），展開時顯示全部 12 連結 + 語言切換。
- 漢堡按鈕使用 `i-menu` SVG（三橫線），關閉使用 `i-x` SVG。
- 不得用 `overflow-x: auto` 橫向捲動導航列（現行行為在窄螢幕可能出現）。

---

## B. 建議新增至 SPEC.md 的條目

### B-1. 首頁釐清器增補（建議加在 §1.2 表格）

| 工具 | 位置 | 輸入 | 邏輯與隱私邊界 | 輸出 | 驗證指標 |
|---|---|---|---|---|---|
| 新手一鍵開始 | `index.html` `#clarifier` 頂部 | 3 題單選：計畫時間（3 個月內／半年內／還在想）＋目前存款（夠機票／夠一個月／還在存）＋最擔心什麼（簽證／錢／找工作／安全） | 純前端矩陣對應到 2–3 個最相關頁面；不寫 storage、不 fetch；無 JS 時隱藏（因為沒有靜態 fallback 的必要，下方已有完整釐清器） | 「你應該先看」＋2–3 張連結卡；附「想看全部？往下滾」連結到完整釐清器 | check.ps1「首頁釐清器」區塊增斷言 |

### B-2. 安全出口浮動按鈕（新增條目）

| 工具 | 位置 | 輸入 | 邏輯與隱私邊界 | 輸出 | 驗證指標 |
|---|---|---|---|---|---|
| 急事浮動鈕 | 全站（`main.js` 注入） | 點擊展開 | 注入 `<button class="fab-emergency">` 在 `</body>` 前；展開 popover 顯示 4 個安全出口連結（複用 `#support-hub` 的連結目標）；當 `#support-hub` 在 viewport 內時 FAB 自動 `opacity: 0; pointer-events: none`；不寫 storage | popover 4 連結 + 關閉鈕 | check.ps1 新增「FAB」區塊 |

### B-3. 閱讀進度條（新增條目）

| 工具 | 位置 | 輸入 | 邏輯與隱私邊界 | 輸出 | 驗證指標 |
|---|---|---|---|---|---|
| 閱讀進度條 | 內容頁（排除 index、about、404、simulator、market） | scroll 事件 | `main.js` 在 DOMContentLoaded 後偵測 `document.body.dataset.readProgress`；存在時注入 `<div class="reading-progress">`；RAF 更新 width；不寫 storage、不觸發 layout thrash | 頂部 2px 進度線 | check.ps1 新增斷言：內容頁有 `data-read-progress`、首頁無 |

### B-4. 過來人小提醒卡片（新增內容元素）

- 新增 CSS class `.community-tip`：左側 `border-left: 3px solid var(--gold)`、
  `background: var(--gold-soft)`、`padding: 12px 16px`、`border-radius: 0 12px 12px 0`。
- HTML 結構：`<aside class="community-tip"><p class="tip-label">過來人說</p><p>...</p></aside>`。
- 內容來源：只放 `thanks.yml` 已公開同意摘錄的真實回饋，不得虛構。
- 每頁最多 3 個，放在段落結尾而非開頭（避免打斷閱讀節奏）。
- 必須標註來源情境（例如：「——2026 年西澳採收背包客」），不揭露姓名。

### B-5. 首頁四大入口順序調整

現行：釐清 → 搜尋 → 社團 → 遊戲。
建議：釐清 → 遊戲 → 搜尋 → 社團。

理由：對新手來說，模擬器的互動體驗比搜尋更能降低焦慮；搜尋的使用門檻其實最高
（需要已經知道要搜什麼），放在遊戲之後更合理。社團放在最後，因為它需要
使用者已經有基本認知才能有效提問。

對應 `nav.home-zone-nav` 的 DOM 順序與 `01–04` 編號需同步調整。
check.ps1「首頁四大入口」區塊的斷言需更新。

### B-6. 頁面標題麵包屑

- 內容頁（排除 index）在 `.page-title` 上方新增 `<nav class="breadcrumb">`。
- HTML：`<a href="index.html">首頁</a> › <span aria-current="page">簽證與集簽</span>`。
- CSS：`font-size: .82rem; color: var(--ink-soft);`，連結加底線。
- 與現有的 BreadcrumbList JSON-LD 對齊（文字 = JSON-LD 的 `name`）。

### B-7. 信任數字列

在現行 `.trust-strip` 下方新增 `.trust-numbers`：

```html
<p class="trust-numbers">
  15 篇攻略 · 38 種語言入口 · 所有數字標註官方來源與查核日期
</p>
```

CSS：`text-align: center; font-size: .88rem; color: var(--ink-soft); letter-spacing: .02em;`。
數字部分用 `<strong>` 包裹。

### B-8. Section 預設折疊規則

- 內容頁超過 6 個 `<section>` 時，第 4 個起的 section 預設以 `<details>` 包裹。
- `<summary>` 包含 `<h2>` + `.section-tldr`。
- 第一個 section（通常是 quick-answer hub 或證據卡）永遠展開。
- URL hash 指向折疊區段時，JS 自動 `open` 對應 `<details>` 並 scroll。
- 無 JS 時所有 `<details>` 仍可手動展開（原生行為）。

---

## C. 建議新增至 ROADMAP.md 的項目

以下依優先級排列，建議編號接續現有 ROADMAP：

| 編號 | 優先級 | 項目 | 影響範圍 | 預估複雜度 |
|---|---|---|---|---|
| UX-1 | P1 | 手機版導航漢堡選單 | `style.css`、`main.js`、全站 HTML | 中（需測試 5 種螢幕寬度） |
| UX-2 | P1 | 內容頁 section 折疊 + 白話摘要 | 9 個內容頁 HTML、`style.css`、`main.js` | 中（需逐頁寫 tldr） |
| UX-3 | P1 | 閱讀進度條 | `style.css`、`main.js` | 低 |
| UX-4 | P2 | 新手一鍵開始入口 | `index.html`、`style.css`、`main.js` | 中 |
| UX-5 | P2 | 安全出口 FAB | `style.css`、`main.js` | 低 |
| UX-6 | P2 | updated-tag 徽章化 | `style.css` | 低 |
| UX-7 | P2 | 首頁四大入口順序調整 | `index.html`、check.ps1 | 低 |
| UX-8 | P2 | 信任數字列 | `index.html`、`style.css` | 低 |
| UX-9 | P3 | 麵包屑導航 | 全站 HTML、`style.css` | 低 |
| UX-10 | P3 | 過來人小提醒卡片 | `style.css`、內容頁 HTML | 中（需收集素材） |

---

## D. 文案調整建議（非結構性，可直接改）

以下為建議的文案微調，不影響 SDD/SPEC 結構，可直接在 HTML 中修改：

### D-1. Hero 區

**現行**：
> 不替你草率做決定，而是幫你看懂選項、查到依據，找到適合自己的下一步。

**建議改為**：
> 去澳洲打工度假，問題一定很多。我們幫你一個一個釐清，不催你、不嚇你。

理由：更口語、更有溫度，像是在跟朋友說話。

### D-2. Trust strip

**現行**：
> 官方來源可回查 · 風險先揭露 · 公開內容免費 · 資料性質說清楚

**建議在下方加一行**：
> 15 篇攻略 · 38 種語言入口 · 每個數字都標官方來源與查核日期

### D-3. 各頁 page-sub 加「30 秒版」提示

在 `page-sub` 下方新增一個 `.quick-take` 區塊：

```html
<div class="quick-take">
  <strong>如果你只有 30 秒：</strong>
  <span>（每頁一句話摘要，例如簽證頁：「先開內政部官方頁核對資格，不要只看社群教學。」）</span>
</div>
```

CSS：`border-left: 3px solid var(--accent); padding: 8px 14px; margin: 12px 0 24px; background: var(--accent-soft); border-radius: 0 8px 8px 0;`

各頁 30 秒摘要建議：

| 頁面 | 30 秒摘要 |
|---|---|
| visa.html | 先開內政部官方頁核對資格與簽證條件，不要只看社群教學。 |
| cost.html | 用存錢試算器算自己的每週收支，再決定要帶多少錢。 |
| housing.html | 簽約前一定要親自看房或請信任的人代看；押金要走官方管道。 |
| work.html | 找工作只用官方或可信平台，任何要你「先付錢」的都是紅旗。 |
| scam.html | 認手法不認名字：只要符合這些模式，不管對方是誰都要停下來查證。 |
| health.html | 沒有保險不要看急診——一通 000 比什麼都重要，但帳單會很貴。 |
| prep.html | 填完 21 項清單再買機票；TFN 和銀行帳戶到了再辦也來得及。 |
| leave.html | 報稅和 super 可以在離開澳洲後線上處理，不用急著在機場搞定。 |
| why.html | 先做 2 分鐘快思測驗，看看自己的動機和底線長什麼樣子。 |
| english.html | 不需要英文很好才能去，但基礎口說能讓你的體驗好很多。 |
| pr.html | PR 是一條長路，先確認你的職業在不在清單上再開始規劃。 |

---

## E. 設計原則補充建議

### E-1. 「溫暖感」的設計語言

現有的設計系統（檸檬布紋、奶油紙張）已經很有溫度。建議在以下地方再加一點人味：

- **按鈕 hover 動畫**：現有的 `translateY(-1px)` 很好，可以再加 `transition: all .2s ease`
  讓它更柔和。
- **卡片 border**：現行 `1.5px solid var(--line)` 可以改成 `border-color: color-mix(in srgb, var(--line) 60%, transparent)`
  讓邊框更柔和，hover 時再恢復完整顏色。
- **section 間距**：現行 `h2` 的 `margin-top: 2.4em` 在手機上可能太大，
  建議 `@media (max-width: 768px)` 改為 `1.6em`。

### E-2. 深色模式微調

現行深色模式的 `--bg: #172329` 偏冷調。建議：
- 把 `--bg` 微調為 `#1a2429`（稍微暖一點）
- 或加入 `background-image` 的深色版檸檬 pattern（降低 opacity 到 .03）

### E-3. 動畫與微互動

- 頁面載入時 hero 區可以加一個 `fade-in + translateY(8px)` 的進場動畫（`duration: .4s`）。
- 折疊的 `<details>` 展開時加 `max-height` transition（需要 JS 輔助）。
- 這些動畫必須在 `prefers-reduced-motion: reduce` 時停用。

---

*本文件為建議性質，所有條目需站長確認後才合併進正式文件。*

---

## F. 主 session 評估（Claude Code，2026-09-03；依 SDD §1.1、OPTIMIZATION_PLAN 與 2026-09-02／03 查核結果逐條裁決；最終由站長在 DECISIONS.md 登錄）

| 條目 | 評估 | 理由與依據 |
|---|---|---|
| A-1 原則 11「新手優先、急事優先」 | 精神已由 P0-8 實作（第一屏＝問句 h1＋4 個階段 chip；安全列常駐、不收合、一鍵可達）；是否寫成 SDD 第 11 條由站長決定 | 「首屏可操作選項 ≤5」與現行設計相容（4 階段 chip＋搜尋）；「10 秒內找到下一步」無數據可驗，只能當目標句 |
| A-1 原則 12「單頁超過 8 個 section 預設折疊」、B-8 | 不採納 | 標竿研究（benchmarks.md §2.3，NN/g）：漸進揭露超過兩層可用性下降；內容頁的長度是證據與官方來源的載體（SDD §1.1 第 2 條），折疊會讓搜尋深連結與 hash 跳轉多一層 JS 相依；P0-11 答案卡已解決「先看重點」 |
| A-2 閱讀進度條、B-3 | 不採納 | 純裝飾；scroll 監聽在低階 Android 有成本（PERF spec P2-3 尚未量測）；不解決任何 §1 診斷的問題 |
| A-2 updated-tag 徽章化 | 可採納（P2，只改 CSS） | 不動 `<span class="updated-tag">` 結構與 check.ps1 斷言；讓查核日期更像信任訊號，與 SDD §1.1 第 2 條一致 |
| A-2 安全出口浮動按鈕、B-2 | 不採納 | P0-8 的安全列已常駐於 header 下方且每個出口一鍵可達（CLARIFIER_SPEC §2 第 2 條）；FAB 在手機會遮內容並與工具頁的固定按鈕衝突；同一功能兩個入口違反「一套入口邏輯」的診斷結論 |
| A-2 Section 白話摘要 | 不採納 | 站長原話「文字太多反而失焦」；每段再加一句是加字不是減字；P0-11 答案卡與頁內目錄已提供「這頁在講什麼」 |
| A-3 手機漢堡選單、禁用橫向捲動導航 | 不採納（可列 P2 待 CWA 數據） | SDD §6 教訓 3：行動版導覽經評審裁決改單列橫向捲動；漢堡選單把 12 個入口藏到第二層，與「第一屏就開始釐清」相反；缺乏使用數據前不推翻既有裁決 |
| B-1 新手一鍵開始（3 題矩陣） | 不採納 | 與釐清器（階段→護照→需求）是平行的第二套入口邏輯，正是 ia-audit §4 診斷要移除的「7 套入口並存」；無 JS 時隱藏也違反釐清器的無 JS 對等原則 |
| B-4 過來人小提醒卡片 | 列 P3 候選 | 符合 SDD §1.1 第 9 條「社群第一手回報分開標示」，但需 thanks.yml 真實同意素材；目前零素材 |
| B-5 首頁四大入口順序 | 已無此問題 | P0-8 刪除四格入口 |
| B-6 麵包屑 | 可採納（P2） | 成本低，與既有 BreadcrumbList JSON-LD 對齊；實作時量內容頁首屏高度（P0-11 之後）再定位置 |
| B-7／D-2 信任數字列「15 篇攻略・38 種語言入口」 | 不採納 | 38 種語言是未校對機器翻譯（SPEC §1.2 多國語言列明示不得說成人工翻譯完成），拿來當信任數字會誤導；承諾列依 P0-8 移頁尾一行 |
| D-1 hero 文案「去澳洲打工度假，問題一定很多。我們幫你一個一個釐清，不催你、不嚇你。」 | 列為 A/B 候選 | 語氣好；P0-8 目前採 Grok 第 1 句「先講你現在卡哪一步，再給你對得上的資料。」（有受眾語感分析支持）；兩者都無數據，CWA／GA4 上線後可輪替量 |
| D-3 各頁「30 秒版」一句 | 採納模式、不採納原文（P0-11 第二階段，7 頁） | 5 個高風險頁已由答案卡主結論（≤35 字）取代；其餘 7 頁可用「30 秒版」一句。原文需改寫：health「沒有保險不要看急診」會勸阻急診，違反安全邊界（改「有立即危險先打 000；一般不適先看 GP 或 healthdirect」）；pr「先確認你的職業在不在清單上」隱含個案路徑判定（改「先分清楚四類公開入口」）；prep「TFN 和銀行帳戶到了再辦也來得及」需對照 prep.html#first-week 順序 |
| E-1 柔化過渡、卡片邊框、手機 h2 間距 | 可採納（P2，只改 CSS） | 需目視審查與 reduced-motion 保護；不影響驗收 |
| E-2 深色底色轉暖、深色檸檬圖樣 | 設計裁量（站長） | 深色 token 有對比驗收（P0-6），改色後需重跑 Lighthouse |
| E-3 hero 進場動畫、details 展開動畫 | 不採納進場動畫；details 動畫隨 B-8 不採納 | SDD §4.3 首頁動態規則已限制；LCP 元素是 h1，進場動畫延後首次繪製 |

結論：採納 4 項小型 CSS／結構改動（updated-tag 徽章、麵包屑、柔化 CSS、其餘 7 頁的 30 秒版一句並改寫文案）列入 P2；其餘與已驗證的診斷或不可協商原則相衝突，不採納。上述均未實作。
