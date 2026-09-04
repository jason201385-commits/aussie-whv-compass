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
→ 呼叫 MiniMax OpenAI 相容 `chat/completions`（`max_tokens` 1024、temperature 0、20 秒逾時，失敗 `502 assist_unavailable`）。
2026-09-02 受控呼叫實測（D-2026-09-02-05）：MiniMax-M2.7 把推理放在 `content` 的 `<think>` 區塊，`max_tokens` 200 會被推理吃光而截斷成零連結；
1024 加上系統提示規則 5（思考極短）後 24 題全部回傳有效站內連結，最長 7 秒、中位數約 5 秒。
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
  三者任一為空或主機不在名單就 fail closed，不會有任何對外呼叫，也不會把 key 或問題送到別的主機。
  **2026-09-04 起正式站已啟用**：`assets/api-config.js` 的 `apiBaseUrl` 指向 `https://api.aussiewhvcompass.com`、
  `turnstileSiteKey` 為公開 site key、`assistEnabled: true`。其餘 API 功能（`contactSubmitEnabled`、
  `dplusMetricsEnabled`、`accommodationSearchEnabled`）各有旗標且維持 `false`——填 `apiBaseUrl` 不等於全開。
- `env.production` 的 D1 `database_id` 已是正式資源；**頂層那份仍刻意保留全零佔位值**，
  讓沒有帶 `--env production` 的 `wrangler deploy` 依舊失敗，不會誤把 dev 形狀的 Worker 推上去。
- Rate Limit `namespace_id=1001`～`1004` 已隨 `--env production` 部署，帳戶內未與其他 Worker 衝突。
- 住宿搜尋不寫 D1，不保存地點、日期、人數或房源快照；request log 只有 method、pathname、status 與隨機 request ID。
- AI 兜底只寫 `assist_daily_usage(day, count)` 一列計數；不保存問題、回覆、token 或 IP；上游失敗只回固定的 `502 assist_unavailable`，不寫任何 log。
- 正式 Turnstile widget 已建立（Managed 模式，hostname 只有 `www.aussiewhvcompass.com`）；site key 是公開值，
  secret 只存在 Worker secret。
- `workers_dev` 與 preview URL 都關閉；本機 dry-run 不等於已部署。
- `observability.enabled` 維持 `false`（資料最小化）。要看即時日誌用 `npx wrangler tail --env production`；
  沒有持久化的請求日誌可事後查，這是刻意的取捨。

## 本機驗證

```powershell
cd worker
npm ci
npm run check
```

需要手動啟動本機 API 時，先把 `.dev.vars.example` 複製為不受版控的 `.dev.vars`，只填 Cloudflare 官方測試值或本機隨機值，再執行 `npx wrangler dev --local`。

## 正式啟用步驟（P0-4）

> **這道閘門是「授權」，不是「能力」。** 在 wrangler 已登入、且 `aussiewhvcompass.com` 這個 zone
> 就在同一個 Cloudflare 帳號的前提下，步驟 1、2、3、5 agent 技術上執行得了。
> 需要站長明確授權的是**決定**本身：這會在站長帳號上開一個對外的付費 AI 端點，已被呼叫掉的用量收不回來。
> 未取得授權前不得執行；執行時凡是 secret 一律只以管線送進 `wrangler secret put`，
> 不 echo、不寫檔、不進 commit、不進對話（Hard Constraint #1／#2）。

前提：`npx wrangler whoami` 顯示你的 Cloudflare 帳號；`wrangler.jsonc` 的 `env.production` 區塊已備妥
（正式 `ALLOWED_ORIGINS` 不含 localhost、`ENVIRONMENT` 為 `production`、自訂網域 `api.aussiewhvcompass.com`）。
以下每一步都在 `worker/` 目錄執行；凡是要輸入 secret 的指令，只由站長本人在自己的終端機輸入，不貼進任何聊天或檔案。

1. 建立正式 D1，把回傳的 `database_id` 填進 `wrangler.jsonc` `env.production.d1_databases[0].database_id`（取代全零）：
   `npx wrangler d1 create aussie-whv-compass`
2. 套用三支 migration 到正式 D1：
   `npx wrangler d1 migrations apply DB --remote --env production`
3. 建立 Turnstile widget（Managed 模式），拿到 site key（公開）與 secret key（保密）。
   **hostname 只填 `www.aussiewhvcompass.com` 一個**：`src/turnstile.ts` 對 siteverify 回傳的 `hostname`
   做嚴格相等比對（單一值，不是清單），而裸網域 `aussiewhvcompass.com` 會 301 導到 `www`，
   widget 不會在裸網域上繪製，多填一個 hostname 只會讓設定與程式碼失去對應。
   前端 action 固定為 `turnstile-spin-v2`，與 `TURNSTILE_EXPECTED_ACTION` 一致。
4. 輸入三個 secret（互動式提示，不要用 echo 管線留在 shell 歷史）：
   `npx wrangler secret put TURNSTILE_SECRET_KEY --env production`
   `npx wrangler secret put RATE_LIMIT_HMAC_KEY --env production`（至少 32 個隨機位元組，例如 `openssl rand -base64 48`）
   `npx wrangler secret put MINIMAX_API_KEY --env production`（api.minimaxi.com 的金鑰；填入前先確認 About 已放 MiniMax 資料處理揭露）
5. 確認 `env.production.ratelimits[*].namespace_id` 在你的帳戶內唯一（沿用 1001–1004 即可，除非別的 Worker 已用），然後部署：
   `npx wrangler deploy --env production`
6. 煙霧測試（把 ORIGIN 換成正式站）：
   `curl -s https://api.aussiewhvcompass.com/api/health`（應回 `ok:true`、`environment:"production"`）
   `curl -s -X POST https://api.aussiewhvcompass.com/api/assist -H "Origin: https://www.aussiewhvcompass.com" -H "Content-Type: application/json" -d "{\"question\":\"二簽要幾天\",\"turnstileToken\":\"x\"}"`
   （應回 Turnstile 驗證失敗的 4xx，證明 CORS、路由與 fail-closed 都在；沒有任何 500）
   `curl -s -X POST https://api.aussiewhvcompass.com/api/assist -H "Origin: https://evil.example" -H "Content-Type: application/json" -d "{}"`（應回 403 `origin_not_allowed`）
7. 前端開關：把 `assets/api-config.js` 的 `apiBaseUrl` 填 `https://api.aussiewhvcompass.com`、`turnstileSiteKey` 填 site key，
   升全站資產版本（`scripts/build_seo.py` 的 `ASSET_VERSION`）並重跑三支 build 腳本與 `scripts/check.ps1`，commit、push。
8. 線上驗收（cache-bust 開首頁）：搜尋零結果後出現「問一次 AI」；送出「二簽要幾天」應得到固定模板＋站內連結；
   DevTools Network 只看到一次 `/api/assist`、`credentials: omit`；D1 `assist_daily_usage` 當日一列 count 加 1，沒有問題文字。
   連續送第 11 次應 429（限流），當日第 201 次應 429 `assist_daily_cap`。
9. 在 `docs/DECISIONS.md` 新增條目記錄回執（health 回應、D1 列、前端截圖），ROADMAP P0-4 與 P0-7 狀態才可改為「已上線」。

回滾：把 `assets/api-config.js` 的 `assistEnabled` 改成 `false` 並 push，前端立即回到「尚未啟用」
（`apiBaseUrl` 與 site key 可以留著，旗標才是開關）；Worker 可留著，無人呼叫即無費用。
要連 Worker 一起收掉再執行 `npx wrangler delete --env production`。

## 正式啟用前人工 gate

1. 站長建立 Worker、D1、Turnstile 與可用的交易信資源。
2. 用真實 D1 ID 取代全零佔位值，並把 secrets 放進 Cloudflare 受保護設定（含 `MINIMAX_API_KEY`；
   在 P0-4 完成、站長審核過 MiniMax 資料處理條款揭露前，不得填入真實金鑰）。
3. 受控驗證 CORS、Turnstile hostname/action、限流、migration、收件與退信。
4. 只有取得正式 API 回執與前端 E2E 證據後，才能稱為已上線。

住宿平台另須逐一通過 [`docs/ACCOMMODATION_PROVIDER_ONBOARDING.md`](../docs/ACCOMMODATION_PROVIDER_ONBOARDING.md)；沒有平台合約／書面許可時，不能把 provider mock 或外部入口稱為站內即時房源。
