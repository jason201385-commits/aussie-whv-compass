# docs/ 索引與閱讀路線

> 版本 2.0｜最後更新 2026-09-03｜接手 agent 從這一頁開始，不要從「讀全文」開始。
> 五份核心文件各管一件事；同一個事實只寫在一個地方，其他地方用 ID 或章節號引用。

## 1. 文件分工

| 檔案 | 管什麼 | 什麼時候改 |
|---|---|---|
| [`SDD.md`](SDD.md) | 憲法與架構：不可協商原則、系統邊界、後端資料契約、第三方治理、設計 token、無障礙基線、資料檔規則、教訓 | 原則、架構或設計系統變動 |
| [`SPEC.md`](SPEC.md) | 現況行為契約：頁面清單、每個工具的輸入／邏輯／輸出／隱私／驗證指標、內容規範、驗收程序、例行維護 | 任何功能行為變動，與程式同一個 commit |
| [`ROADMAP.md`](ROADMAP.md) | 全部 P0／P1／P2 編號的唯一登記與一行狀態；未完成項目的需求摘要；未編號的漂移與加固清單 | 開新項目、狀態改變 |
| [`DECISIONS.md`](DECISIONS.md) | 按日期的決策與證據日誌：站長拍板、反方裁決、完成時的本機證據、取代關係 | 每次拍板、每次反方審查、每次完成 |
| [`CLARIFIER_SPEC.md`](CLARIFIER_SPEC.md) | P0-7 首頁單一漏斗釐清器的專題規格：前提決策、邊界、漏斗骨架、AI 兜底、社團目錄、量測 | 釐清器設計與實作期間 |
| [`OPTIMIZATION_PLAN.md`](OPTIMIZATION_PLAN.md) | 全站優化規格：首屏重構、搜尋強化、釐清器文案與護照分支、內容頁答案卡、社團目錄子頁、指標、AI 兜底啟用、內容分流（P0-8～P0-11、P1-21～P1-23、P2-5～P2-6） | 該領域的規格變動、工作項狀態改變 |
| [`UX-SUGGESTIONS.md`](UX-SUGGESTIONS.md) | 外部模型（千問，2026-09-03）對 SDD／SPEC 的 UX 建議增補；建議性質，未合併；主 session 逐條評估附於該檔 §F，採納與否由站長在 DECISIONS 登錄 | 站長裁決後搬入對應文件或關閉 |
| [`PERFORMANCE_AND_RETENTION_SPEC.md`](PERFORMANCE_AND_RETENTION_SPEC.md) | 效能、無障礙與留存的專題規格（P0-5、P0-6、P1-15～P1-20、P2-3、P2-4）與量測基準 | 該領域的規格變動 |
| [`MEASUREMENT_SETUP.md`](MEASUREMENT_SETUP.md) | GA4 與 Search Console 的人工前置步驟 | 量測方式變動 |
| [`ACCOMMODATION_PROVIDER_ONBOARDING.md`](ACCOMMODATION_PROVIDER_ONBOARDING.md) | 住宿 provider 授權、secret、商業關係、E2E 與公開開關 gate | provider 狀態變動 |
| [`ACCOMMODATION_PROVIDER_APPLICATION_PACK.md`](ACCOMMODATION_PROVIDER_APPLICATION_PACK.md) | 五個住宿平台的申請文字與站長人工欄位 | 申請進度變動 |

## 2. 每個任務都要先讀（不可省略）

1. `SDD.md` §1.1 不可協商原則（9＋1 條）。
2. `SPEC.md` §0 執行者邊界（只有站長能做的事、外部寫入要先問）。
3. `ROADMAP.md` §1：找到你的 ID；沒有就先登記一列再開工。

節選閱讀只省略「與任務無關的行為細節」，不省略邊界。

## 3. 依任務類型只讀這些

| 任務 | 額外要讀的章節 |
|---|---|
| 改內容頁文字或數字 | `SPEC.md` §1.1、§2 內容規範、§5 例行維護；碰郵遞區號時加 `SDD.md` §5 |
| 新增或重組頁面 | `SDD.md` §2.1–§2.2；`SPEC.md` §1.1、§4 驗收；`scripts/build_seo.py`、`build_search.py`、`build_i18n.py` 的 `--check` |
| 改互動工具 | `SPEC.md` §1.2 該工具那一列；`SDD.md` §3（storage keys、特徵偵測）、§4.5 無障礙 |
| 首頁或釐清器（P0-7） | `CLARIFIER_SPEC.md` 全文；`DECISIONS.md` D-2026-09-02-01；`SDD.md` §3.2 |
| 全站優化（P0-8～P0-11、P1-21～P1-23、P2-5～P2-6） | `OPTIMIZATION_PLAN.md` 全文；`DECISIONS.md` D-2026-09-02-05、D-2026-09-02-06；`CLARIFIER_SPEC.md` §0.1；AI 兜底啟用另讀 `worker/README.md` 正式啟用步驟 |
| Worker／API | `SDD.md` §3.1；`worker/README.md`；`ROADMAP.md` P0-4 |
| 效能、無障礙、留存 | `PERFORMANCE_AND_RETENTION_SPEC.md`；`ROADMAP.md` §3 |
| 第三方入口、商業關係、社團 | `SDD.md` §3.2；`third-party-register.json`；`ACCOMMODATION_*.md` |
| 量測與分析 | `SPEC.md` §1.5；`MEASUREMENT_SETUP.md`；`DECISIONS.md` D-2026-09-02-01 |
| 翻譯與多語 | `SPEC.md` §1.2 多國語言列；`SDD.md` §3 多國語言；`ROADMAP.md` P2-2 |
| 改交接文件本身 | 本檔 §4 |

## 4. 文件更新規則（標「[檢查]」者由 `scripts/check.ps1` 強制）

- [檢查] 改了 `SDD.md`、`SPEC.md`、`ROADMAP.md`、`DECISIONS.md`、`CLARIFIER_SPEC.md`、本檔任一檔，該檔標頭「最後更新」必須是當天日期。
- [檢查] 任何 `docs/*.md` 出現的 `P0-n`／`P1-n`／`P2-n` 都必須在 `ROADMAP.md` §1 表中有一列。
- [檢查] 任何 `D-YYYY-MM-DD-nn` 引用都必須在 `DECISIONS.md` 有對應標題。
- [檢查] 本檔 §1 必須列出 `docs/` 下每一個 `.md`。
- [檢查] `SPEC.md` §1.1 頁面清單必須包含根目錄所有內容頁（`404.html` 除外）。
- `DECISIONS.md` 不改舊條目；推翻舊決策時新增條目並寫「取代 D-…」。
- 狀態只能用 `ROADMAP.md` §0 的詞彙；「程式完成／本機驗證」不得寫成「已上線」。
- 規格檔不寫日期敘事與量測表；那些放 `DECISIONS.md`。規格旁只留「驗證指標」：測試檔或 `check.ps1` 區塊、預期結果、對應 commit。
- 同一個數字（頁數、入口數、測試數）只在一處寫死；其他地方引用章節。

## 5. 接手 agent 啟動指令

> 讀本檔 → `SDD.md` §1.1 → `SPEC.md` §0 → 跑 `scripts/check.ps1` 確認基線乾淨 →
> 在 `ROADMAP.md` 找到或登記 ID → 依 §3 節選閱讀 → 實作 →
> 同一個 commit 更新 `SPEC.md`／`ROADMAP.md`／`DECISIONS.md` 對應段落並更新標頭日期 →
> 再跑 `scripts/check.ps1` → commit 訊息寫 ID 與為什麼。
> P0-1／P0-3／P0-4 沒拿到人工前置就跳過，不要自行註冊任何帳號。
