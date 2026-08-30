# Cloudflare Worker（本機骨架）

這個目錄是 GitHub Pages 靜態前端之外的獨立無框架 API。現階段只有程式與本機測試，沒有建立、綁定或部署任何正式 Cloudflare 資源。

## 邊界

- 僅承接需求單、確認信／刪除流程與無個人識別的 D+ 聚合計數。
- 不在 repo、前端或 log 放 `TURNSTILE_SECRET_KEY`、`RATE_LIMIT_HMAC_KEY` 或寄信憑證。
- `wrangler.jsonc` 的 D1 `database_id` 是不可部署的全零佔位值。P0-4 完成後才由站長建立正式資源並在 Cloudflare 受保護設定輸入 secrets。
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
