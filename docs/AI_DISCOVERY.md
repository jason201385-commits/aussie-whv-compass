# AI／Claude 探索與維護

> 最後更新 2026-09-17｜P1-26｜工程可讀性不等於收錄、排名或引用保證。

## 目前提供什麼

HTML 為原文與 canonical。`llms.txt` 為導覽，`ai-index.json` 列出明確白名單的繁中主頁與完整英文攻略、逐節網址、來源連結、語言、查核範圍與閱讀副本 SHA-256。`ai/*.md`、`ai/en/*.md` 是原 main 的靜態閱讀摘錄；`llms-full.txt` 合併這些摘錄，建議先用較小的單頁版本。

純文字保留標題、段落、清單、表格、原文來源與日期；排除腳本、表單、隱藏 UI、動態物品卡及互動結果。不抓外部網站，不聯絡 GitHub 投稿 API，不讀醫師後台或 Supabase。不修改原攻略的事實或審校狀態，沒有為 bot 另外改寫答案；一般訪客也能使用頁尾的相同純文字連結。

SEO 產生器同步維護所有衍生格式，不能手動修改副本。此版本提供靜態 Markdown URL，沒有宣稱實作 HTTP Accept 內容協商或 Cloudflare Markdown for Agents。

```sh
python scripts/build_seo.py
python scripts/test_ai_reading.py
python scripts/build_seo.py --check
python scripts/build_i18n.py --check
python scripts/build_search.py --check
```

CI 對 PR／main push 執行離線一致性檢查；它不自動更動 Cloudflare 或代為發文。既有 GitHub Pages 發布流程不因這些檢查自動變成受保護的合併閘門。

## Claude 的三個爬蟲不是同一件事

依 [Anthropic 官方說明](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)：Claude-SearchBot 用於搜尋，Claude-User 回應使用者指定的網站讀取；ClaudeBot 蒐集可能用於模型訓練的網頁。不要把訓練抓取次數當成搜尋曝光，也不要為了搜尋曝光另行允諾模型訓練。本站保留既有 wildcard 抓取偏好，新增的兩個搜尋／使用者群組重複相同私人路徑排除；沒有新增訓練授權。

robots 不是真正的存取防護，亦不能強制任何服務抓取。Cloudflare 真實爬蟲辨識、網路規則、來源伺服器回應是另一層。

## Cloudflare 排查順序

1. 在 AI Crawl Control 篩選 Anthropic，分別看 Claude-SearchBot、Claude-User、ClaudeBot，確認想讓其讀取的公開內容採 Allow。不要只依灰色開關判斷狀態。[官方操作](https://developers.cloudflare.com/ai-crawl-control/features/manage-ai-crawlers/)
2. 針對失敗請求記錄時間、完整路徑、HTTP 狀態碼、Ray ID、命中的規則及服務。失敗可能是安全規則，也可能是 origin／路徑錯誤，截圖總數不能決定原因。查錯誤網址不是一律放寬防火牆。
3. 在 Security Events 核對 WAF／rate limit／challenge。AI Crawl Control 設 Allow，不會免除其他 WAF 規則。只修正已確認的誤判，限定正式主機、公開唯讀路徑與經驗證的 crawler；不採僅 User-Agent 的全站 Skip，不跳過 API／登入／私人端點。[規則順序](https://developers.cloudflare.com/ai-crawl-control/configuration/ai-crawl-control-with-waf/)
4. 讀取 www 與裸網域實際送出的 robots，對照 repo。Managed robots 可能在原文前新增 AI 排除指令；依真正的搜尋／訓練偏好處理衝突，不直接刪除所有防護。[Managed robots](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
5. 免費方案 Bot Fight Mode 不接受 WAF Skip 例外。只有事件確定它誤擋時，才另評估取捨；本次不自動關閉。[限制](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/)

## 驗收與衡量

以正式 HTTPS GET 檢查 robots、sitemap、llms、ai-index、每個 Markdown 的狀態碼、內容類型、SHA-256 與來源連結。User-Agent 模擬只能測相容性，不代表使用 Anthropic 的真實來源 IP 或完成爬蟲驗證。200／允許並非收錄證據；確認實際爬取需看服務端事件，確認引用需保留真正的搜尋回答與引用網址。

改版前 run 35125014325：GitHub runner 對四個 UA × 五個公開路徑的 20 個請求全為 HTTP 200，三個網域／HTTP alias 的 robots 亦可讀。沒有證據支持整站已全面封鎖 Claude，但不能解釋截圖中個別失敗。

Google 的 [AI 搜尋文件](https://developers.google.com/search/docs/appearance/ai-features) 說明不需要專用 AI schema 或 AI 文字檔才能出現；本次 Markdown 是可閱讀的補充格式，不是特殊排名機制。原始內容品質、可回查來源、搜尋可索引性與 CDN 存取仍需持續維護。
