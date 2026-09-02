# Cloudflare Worker（本機骨架）

這個目錄是 GitHub Pages 靜態前端之外的獨立無框架 API。現階段只有程式與本機測試，沒有建立、綁定或部署任何正式 Cloudflare 資源。

本機已實作 `POST /api/contact`、`/api/contact/manage`、`/api/contact/update`、
`/api/contact/delete`、`/api/metrics`、`/api/accommodation/search`、`/api/assist` 與每日 retention purge。住宿端點只接受嚴格白名單欄位，
只輸出經平台網域與長度驗證的授權 provider 結果；目前 production provider 清單故意為空，所以只回傳五個平台的
`external-link-only` 狀態，不會抓平台頁面或假造房源。預設 mail transport 故意停用；測試只使用記憶體 mock，
所以 `emailStatus=sent` 是本機介面證據，不是外部送達證據。

`POST /api/assist` 是首頁釐清器最後一層的 AI 兜底（`docs/CLARIFIER_SPEC.md` §4）。模型只當**路由器**：
它只能回 `{"links":["<SITE_CATALOGUE href>", ...]}`（1 到 3 個；可多帶一個會被忽略的 `intent`），使用者看到的
每一句話都由伺服器固定模板組成（固定導語＋每個目錄項目自己的一句 `lead`），模型的任何自由文字一律不呈現。
只接受 `{ question, turnstileToken }` 兩個欄位（2 KiB、問題 4 到 200 字）；順序是敏感關鍵詞先攔（回固定安全出口，
不驗 Turnstile、不算額度）→ 個人判定分類器 `ASSIST_DETERMINATION`（能不能申請、有沒有資格、合法嗎、該不該看醫生、
退稅多少、am I eligible、is it legal、how much tax 等，命中即回 `official_exit` 固定文案＋依主題配對的官方出口：
簽證 `visa.html#apply`＋`pr.html#overview`、醫療 `health.html#doctor`、稅務 `cost.html#tax`＋`leave.html#dasp-calc`、
工作／法律 `work.html#verify`＋`scam.html#help`，無主題線索時四類各一個；不呼叫模型、不算額度）
→ 缺 `CF-Connecting-IP` 即 `400 client_ip_missing`（fail closed，不共用限流桶）→ Turnstile
→ 以 `HMAC(CF-Connecting-IP)` 限流 → 每日總額度（`assist_daily_usage` 一天一列的 atomic 計數，超額 `429 assist_daily_cap`）
→ `MINIMAX_API_KEY` 為空、或 `ASSIST_BASE_URL` 不是 https、或主機不在 `ASSIST_ALLOWED_HOSTS`
（`api.minimaxi.com`、`api.minimax.io`）即 `503 assist_not_configured`
→ 呼叫 MiniMax OpenAI 相容 `chat/completions`（8 秒逾時，失敗 `502 assist_unavailable`）。
`kind` 仍是 `answer`／`official_exit`／`over_cap`／`refused`：`answer.answer` 是伺服器模板文字，`links` 只含
白名單站內連結；模型沒有回任何有效 href 時改為 `refused`（固定兜底文案＋站內搜尋、各地社團目錄）。
問題文字、模型回覆與 token 不寫 D1、不進 log；`assist.ts` 完全不使用 `console`，這條路由和 `/api/metrics`
一樣沒有 request log 行。

## 邊界

- 僅承接需求單、確認信／刪除流程、無個人識別的 D+ 聚合計數、日後已取得書面授權的平台住宿單次搜尋，以及首頁 AI 兜底的單次轉發。
- 所有 `POST` 路由（含 `/api/metrics`）都要求請求帶 `Origin` 且在 `ALLOWED_ORIGINS` 白名單內；缺少或不在名單一律 `403 origin_not_allowed`，用 curl 做煙霧測試時要加 `-H "Origin: http://localhost:4175"`。`GET /api/health` 不受此限。
- 不在 repo、前端或 log 放 `TURNSTILE_SECRET_KEY`、`RATE_LIMIT_HMAC_KEY`、`MINIMAX_API_KEY` 或寄信憑證。
- AI 兜底的公開設定是 `wrangler.jsonc` 的 `ASSIST_DAILY_CAP`（每 Perth 日 200 次）、`ASSIST_MODEL`、
  `ASSIST_BASE_URL`（只接受 https，且主機必須在 `ASSIST_ALLOWED_HOSTS` 內）；secret 只有 `MINIMAX_API_KEY`。
  三者任一為空或主機不在名單就 fail closed，不會有任何對外呼叫，也不會把 key 或問題送到別的主機。前端 `assets/api-config.js` 的 `apiBaseUrl` 與 `turnstileSiteKey` 仍為空，所以正式站目前零 request。
- `wrangler.jsonc` 的 D1 `database_id` 是不可部署的全零佔位值。P0-4 完成後才由站長建立正式資源並在 Cloudflare 受保護設定輸入 secrets。
- Rate Limit `namespace_id=1001`～`1004` 是本機設定範本；正式啟用前要由站長確認帳戶內唯一值。
- 住宿搜尋不寫 D1，不保存地點、日期、人數或房源快照；request log 只有 method、pathname、status 與隨機 request ID。
- AI 兜底只寫 `assist_daily_usage(day, count)` 一列計數；不保存問題、回覆、token 或 IP；上游失敗只回固定的 `502 assist_unavailable`，不寫任何 log。
- 正式 Turnstile widget 與 site key 仍未建立；`turnstile-spin` 的遠端 wizard 暫停到 P0-4。
- `workers_dev` 與 preview URL 都關閉；本機 dry-run 不等於已部署。

## 本機驗證

```powershell
cd worker
npm ci
npm run check
```

需要手動啟動本機 API 時，先把 `.dev.vars.example` 複製為不受版控的 `.dev.vars`，只填 Cloudflare 官方測試值或本機隨機值，再執行 `npx wrangler dev --local`。

## 正式啟用前人工 gate

1. 站長建立 Worker、D1、Turnstile 與可用的交易信資源。
2. 用真實 D1 ID 取代全零佔位值，並把 secrets 放進 Cloudflare 受保護設定（含 `MINIMAX_API_KEY`；
   在 P0-4 完成、站長審核過 MiniMax 資料處理條款揭露前，不得填入真實金鑰）。
3. 受控驗證 CORS、Turnstile hostname/action、限流、migration、收件與退信。
4. 只有取得正式 API 回執與前端 E2E 證據後，才能稱為已上線。

住宿平台另須逐一通過 [`docs/ACCOMMODATION_PROVIDER_ONBOARDING.md`](../docs/ACCOMMODATION_PROVIDER_ONBOARDING.md)；沒有平台合約／書面許可時，不能把 provider mock 或外部入口稱為站內即時房源。
