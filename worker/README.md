# Cloudflare Worker

這個目錄是靜態前端之外的獨立無框架 API。P1-32 的目前版本以「站內找答案」為預設，
選用 AI 入口只使用 Cloudflare Workers AI 原生 binding；外部模型 HTTP 呼叫、供應商切換與模型 API key 設定已移除。
本輪決策見 `docs/DECISIONS.md` D-2026-10-09-03。程式、本機 mock 或 dry-run 通過，均不等於正式部署或模型品質驗收。

已實作 `POST /api/contact`、`/api/contact/manage`、`/api/contact/update`、`/api/contact/delete`、
`/api/metrics`、`/api/accommodation/search`、`/api/assist/cloudflare`，以及 `GET /api/news`、官方消息同步與 retention purge。
住宿端點只接受嚴格白名單欄位，只輸出經平台網域與長度驗證的授權 provider 結果；目前 production provider 清單為空，
只回五個平台的 `external-link-only` 狀態，不會抓平台頁面或假造房源。預設 mail transport 停用；測試的
`emailStatus=sent` 只證明 mock 介面。正式環境設定 `RESEND_API_KEY` 後才會使用 Resend（見下方交易信章節）。

## P1-32：站內搜尋與 Cloudflare AI 入口

前端 `assets/api-config.js` 的 `assistMode: 'local'` 為預設，`assistEnabled` 是入口總開關。
問題先在瀏覽器中比對本站答案與公開搜尋索引，不載入 Turnstile、不呼叫 AI 端點，也不需要模型 key。
舊 `remote`、未填或陌生模式都只保留本機導航，不會沿用舊供應商。

`assistMode: 'cloudflare'` 仍先做本機搜尋；沒有可靠結果時才提供「用 Cloudflare AI 找站內內容」。
使用者點選後先看到 Cloudflare 資料處理揭露並完成 Turnstile，再明確送出才呼叫新端點。
搜尋輸入本身不會自動送模型，也不會在模型失敗後改送其他服務。

| 端點 | 行為 | 資料與用量 |
|---|---|---|
| `POST /api/assist/cloudflare` | 原生 `AI.run(...)` 協助挑選站內連結 | 通過防護後才推論；問題、答案與 token 不保存 |
| `POST /api/assist` | 固定 `410 assist_endpoint_retired`，提示重新整理 | 不讀取 body、不驗 Turnstile、不觸碰 D1／限流／模型；共用 Origin gate 仍有效 |

新端點讓快取中仍揭露舊供應商的前端失效，避免在使用者看見舊揭露時，悄悄把問題改送 Cloudflare。
兩條路由都不產生 request log。

### AI 只挑連結，答案由固定模板組成

模型只回 `{"links":["<SITE_CATALOGUE href>", ...]}`，最多採用 3 個既有站內連結。
使用者看到的每句話都由伺服器固定模板組成（固定導語＋各目錄項目的 `lead`）；
模型自由文字、生成的標題、外部網址及不存在的 anchor 一律不呈現。

只接受 `{ question, turnstileToken }` 兩個欄位，body 上限 2 KiB，問題 4 到 200 字。執行順序為：

1. 敏感關鍵詞先回固定安全出口，不驗 Turnstile、不算額度、不呼叫模型。
2. 個人簽證、法律、醫療或稅務判定回 `official_exit`，依主題提供既有官方查核入口，同樣不呼叫模型。
3. 缺 `CF-Connecting-IP` 回 `400 client_ip_missing`；接著驗 Turnstile hostname/action、HMAC IP 限流。
4. 原子保留每日總額度 `assist_daily_usage(day, count)`，每 Perth 日預設 200 次；額度不足回 `429 assist_daily_cap`。
5. 確認 `AI` binding 及原生模型 ID，缺漏回 `503 assist_not_configured`；最多呼叫一次 `AI.run(...)`。

推論使用 `max_tokens: 1024`、`temperature: 0`、非串流回覆，最多等 20 秒。
Workers AI 必須回含字串 `response` 的物件；格式不符、超出 64 KiB、權限／額度錯誤或逾時都回固定
`502 assist_unavailable`。模型文字不是有效 JSON 或沒有白名單連結，回 `refused` 加站內搜尋／社團入口。
期限到會送取消訊號並停止等待；已開始的推論是否產生用量，以 Cloudflare 計費為準。

成功回應的 `kind` 是 `answer`、`official_exit` 或 `refused`，統一帶 `provider: 'cloudflare'` 供前端核對此路由；
`official_exit` 仍是 Worker 固定前置分類結果，這個欄位不代表已執行模型推論。
每日超額另回 `over_cap`。不記問題、模型回覆、Turnstile token、IP 或每次請求資料；D1 只保留一天一列的計數。

### 原生 binding 設定

`wrangler.jsonc` 頂層及 `env.production` 均包含：

```json
{
  "ai": { "binding": "AI" },
  "vars": {
    "CLOUDFLARE_ASSIST_MODEL": "@cf/meta/llama-3.1-8b-instruct-fp8",
    "ASSIST_DAILY_CAP": "200"
  }
}
```

此為節錄，不能拿它覆蓋整份設定。模型 ID 必須符合 `@cf/<author>/<model>`；不接受外部模型、gateway 或自訂 URL。
[官方模型頁](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8/)
在 2026-10-09 查核時提供 `messages`、`max_tokens`、`temperature` 及 `response: string` 介面。
本輪尚未實測該模型的中文命中率、延遲與實際用量；換模型前須核對相同介面。

原生 [Workers AI binding](https://developers.cloudflare.com/workers-ai/configuration/bindings/) 不需要外部模型 key，
但仍需 Cloudflare 帳戶、模型權限與用量；真正呼叫 AI 時，問題會送至 Cloudflare。
免費額度及超額價格以 [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) 為準。
依 [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/)，bindings、vars 與 secrets
不會由頂層繼承到 production，因此兩處相應設定都要保留。

## 邊界

- 所有 POST（含退役端點與 `/api/metrics`）都要求白名單 `Origin`；缺少或不符回 `403 origin_not_allowed`。
  `GET /api/health` 可供無 Origin 的健康檢查，但成功不表示 AI 權限、額度或模型功能正常。
- `TURNSTILE_SECRET_KEY`、`RATE_LIMIT_HMAC_KEY`、`RESEND_API_KEY` 不放 repo、前端、檔案回執或 log。
  AI 不需要模型 API key。Turnstile 與 HMAC secrets 只由遠端路由使用，本機搜尋不需要。
- `contactSubmitEnabled`、`dplusMetricsEnabled`、`accommodationSearchEnabled` 維持既有各自旗標；AI 設定不會替其他功能開關。
- `env.production` 已填正式 D1 ID；頂層故意保留全零，避免忘記 `--env production` 時誤部署。
  既有 D1、Rate Limit namespace 及 Turnstile 應先核對並重用，不要因切換 AI 重建。
- Turnstile hostname/action 是嚴格比對：正式 hostname 為 `www.aussiewhvcompass.com`，action 為 `turnstile-spin-v2`。
- 住宿搜尋不寫 D1；AI 只寫 `assist_daily_usage(day, count)`。`observability.enabled`、`workers_dev`、preview URL 維持停用。
- 此 Worker 也包含 P1-29 官方消息路由及排程；部署整個版本時要一併核對 `0004`、`0005` 等所需 migration，不能只驗 AI 就宣稱整版完成。

## 本機驗證

```powershell
cd worker
npm ci
npm run check
```

`vitest.config.ts` 使用 `remoteBindings: false`；所有 AI 案例提供 mock `AI.run`，不建立遠端 binding session，
不呼叫真實模型。Wrangler 可能印出原生 AI 的通用遠端用量提醒，不能把它當成真實模型測試證據。
一般回歸驗證只需此 mock 流程。

若需手動啟動其他本機 API，先把 `.dev.vars.example` 複製為不受版控的 `.dev.vars`，只填官方測試值或本機隨機值，
再執行 `npx wrangler dev --local`。**`--local` 不會把 Workers AI 變成本地模型**，不得在普通本機測試中意外呼叫新 AI 端點。

## 部署與正式驗收

2026-10-09 這次工作環境的 Wrangler 未登入 Cloudflare，程式變更不能代表已部署或已清除帳戶中的舊 secret。
先完成下列帳戶操作，再把前端從 `local` 改為 `cloudflare`。本輪使用者已要求移除外部模型並改用 Cloudflare；
是否有新資源或超出既有範圍的付費設定，依實際帳戶狀態與 `docs/SPEC.md` §0 核對，不重建已存在資源。

1. 在有存取權的終端機執行 `npx wrangler whoami`，核對正式 Worker、D1、Turnstile 與域名。
   先用 `npx wrangler d1 migrations list DB --remote --env production` 核對現有 schema；
   目前整版 Worker 需要 repo 中 `0001` 至 `0005` 的 migration。若仍有未套用項目，先審核完整變更與既有部署狀態，
   再使用 `npx wrangler d1 migrations apply DB --remote --env production`；不要盲目再建立 D1。
2. 核對 production 的 `ai.binding: 'AI'`、原生模型權限、`ASSIST_DAILY_CAP`、既有限流及 Turnstile hostname/action。
   既有 Turnstile/HMAC secrets 若已存在，不要重新輸入或輪替。只有缺少時才在私有終端機以互動式
   `npx wrangler secret put TURNSTILE_SECRET_KEY --env production` 或
   `npx wrangler secret put RATE_LIMIT_HMAC_KEY --env production` 設定；不貼到聊天、不寫入版控。
3. 完成根目錄 `scripts/check.ps1`，在 `worker/` 執行 `npx wrangler deploy --env production`。
   這會發布整個 Worker，也會更新其他既有路由／排程；一併驗證 P1-29 的所需 schema 及正式回應。
4. 用正式 Origin 驗證舊 `POST /api/assist` 回 `410 assist_endpoint_retired`，新
   `POST /api/assist/cloudflare` 用無效 token 回 Turnstile 4xx、陌生 Origin 回 403，且不呼叫模型。
   再用少量受控、真實 Turnstile 請求驗收中文導覽、白名單結果、固定文案、延遲及用量；每日限額／高頻限流用 mock 測試證明，
   不為了測限流去消耗大量真實推論。記錄不含問題、token、secret 的必要部署回執。
5. 新 Worker 驗收後，刪除帳戶中的舊模型 secret：
   `npx wrangler secret delete MINIMAX_API_KEY --env production`。
   此動作只移除 Cloudflare 端儲存的舊 secret；如需撤銷原供應商帳戶的金鑰，另在原供應商管理介面處理。
   程式已不讀舊設定，刪除遠端 secret 的完成狀態必須由實際回執確認。
6. 保留 `assistMode: 'local'` 直到前述驗收完成，再將前端改為 `assistMode: 'cloudflare'`，
   核對送出前揭露、About 資料說明及 `apiBaseUrl`／公開 site key，同批更新資產版本、產物與完整檢查。
   用正式網頁驗收本機搜尋不送 AI、明示確認後只有一次 `/api/assist/cloudflare`、`credentials: 'omit'`、取消不重繪、失敗保留站內入口。
7. 在 DECISIONS／ROADMAP 記錄實際完成與未完成項目；只有正式回執與前端 E2E 都成立才標示 AI 已上線。

回到本機模式：把 `assistMode` 改回 `local` 並發布前端，保留站內搜尋。
這只停止新版前端提供 AI 送出入口；若要停掉伺服器的所有推論，將 production `ASSIST_DAILY_CAP` 設為 `0` 並重新部署，
此時一般 AI 請求會固定走超額處理，安全與個人判定仍回固定出口，其他 API 不需刪除。
不要以舊 Worker 版本回滾而重新引入已移除的外部模型路徑。

## 啟用交易信（Resend）

Contact API 的確認信走 Resend HTTP API（`POST https://api.resend.com/emails`）。Worker 程式已含 `ResendMailTransport`；**在 domain 驗證與 secret 就緒前，前端 `contactSubmitEnabled` 必須維持 `false`。**

1. 在 [Resend](https://resend.com) 建立帳號，把 `aussiewhvcompass.com` 加為 sending domain，並依儀表板指示完成 DNS（SPF / DKIM；有要求再加 DMARC）。
2. Domain 狀態變為 Verified 後，建立 API key（權限只要寄信即可）。
3. 在本機 `worker/` 互動式寫入 secret（不要 echo、不要貼進聊天或檔案）：
   `npx wrangler secret put RESEND_API_KEY --env production`
4. 確認 `wrangler.jsonc` 的 `MAIL_FROM` 為已驗證網域上的位址（預設 `noreply@aussiewhvcompass.com`）。若要另外通知站長，可在 `env.production.vars` 加 `CONTACT_NOTIFY_TO`（例如 About 頁的站長信箱）；owner 信不含 management token，但會設 `reply_to` 為送件人。
5. 重新部署：`npx wrangler deploy --env production`
6. 煙霧：用受控 Turnstile token 打一次 `POST /api/contact`（或本機 mock），確認收件匣有 zh-Hant／en 確認信，且回傳 `emailStatus:"sent"`。Resend dashboard 應看到對應 delivery。
7. **驗證成功後**才把前端打開：
   - `assets/api-config.js` → `contactSubmitEnabled: true`
   - 更新 `about.html`／`lang/en/about` 相關文案（若仍寫「尚未開放送出」）
   - 升資產版本、commit、push

回滾：先把 `contactSubmitEnabled` 改回 `false` 並 push；需要停寄信時可 `npx wrangler secret delete RESEND_API_KEY --env production` 後再 deploy（會回到 DisabledMailTransport，案件仍會寫入且 `emailStatus:"queued"`）。

住宿平台另須逐一通過 [`docs/ACCOMMODATION_PROVIDER_ONBOARDING.md`](../docs/ACCOMMODATION_PROVIDER_ONBOARDING.md)；沒有平台合約／書面許可時，不能把 provider mock 或外部入口稱為站內即時房源。
