# Cloudflare Worker（本機骨架）

這個目錄是 GitHub Pages 靜態前端之外的獨立無框架 API。現階段只有程式與本機測試，沒有建立、綁定或部署任何正式 Cloudflare 資源。

本機已實作 `POST /api/contact`、`/api/contact/manage`、`/api/contact/update`、
`/api/contact/delete`、`/api/metrics`、`/api/accommodation/search` 與每日 retention purge。住宿端點只接受嚴格白名單欄位，
只輸出經平台網域與長度驗證的授權 provider 結果；目前 production provider 清單故意為空，所以只回傳五個平台的
`external-link-only` 狀態，不會抓平台頁面或假造房源。預設 mail transport 故意停用；測試只使用記憶體 mock，
所以 `emailStatus=sent` 是本機介面證據，不是外部送達證據。

## 邊界

- 僅承接需求單、確認信／刪除流程、無個人識別的 D+ 聚合計數，以及日後已取得書面授權的平台住宿單次搜尋。
- 不在 repo、前端或 log 放 `TURNSTILE_SECRET_KEY`、`RATE_LIMIT_HMAC_KEY` 或寄信憑證。
- `wrangler.jsonc` 的 D1 `database_id` 是不可部署的全零佔位值。P0-4 完成後才由站長建立正式資源並在 Cloudflare 受保護設定輸入 secrets。
- Rate Limit `namespace_id=1001`～`1003` 是本機設定範本；正式啟用前要由站長確認帳戶內唯一值。
- 住宿搜尋不寫 D1，不保存地點、日期、人數或房源快照；request log 只有 method、pathname、status 與隨機 request ID。
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
2. 用真實 D1 ID 取代全零佔位值，並把 secrets 放進 Cloudflare 受保護設定。
3. 受控驗證 CORS、Turnstile hostname/action、限流、migration、收件與退信。
4. 只有取得正式 API 回執與前端 E2E 證據後，才能稱為已上線。

住宿平台另須逐一通過 [`docs/ACCOMMODATION_PROVIDER_ONBOARDING.md`](../docs/ACCOMMODATION_PROVIDER_ONBOARDING.md)；沒有平台合約／書面許可時，不能把 provider mock 或外部入口稱為站內即時房源。
