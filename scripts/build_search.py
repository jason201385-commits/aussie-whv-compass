#!/usr/bin/env python3
"""Build a same-origin, client-side search index from the public HTML pages.

Index contract (assets/search-index.js, consumed by assets/main.js search-core and
scripts/test_search.mjs):
- one "本頁總覽" entry per page (keywords = page alias) plus one entry per <h2> section;
- extra pages outside PAGES (EXTRA_PAGES) get a fixed page title and href base;
- elements carrying data-search-entry="標題|#錨點" inside <main> become their own entry
  (used by the homepage clarifier exits); the element must carry the same id as the anchor;
- INTENT_SYNONYMS (keyed by href) are written into the entry's "synonyms" field: colloquial,
  Simplified-Chinese and English ways of asking the 48 quick-answer questions. The client scores
  synonyms at 0.7 of an original-text hit;
- entries that are navigation hubs (quick-answers, *-first-action evidence cards, clarifier exits)
  carry "hub":1 so the client can down-weight them.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets" / "search-index.js"
VERSION = "2026-09-03"
# P0-9 驗收 8：索引檔大小增加不得超過改版前（178,908 bytes）的 30%。
MAX_INDEX_BYTES = 232580
INACTIVE_UI_SENTINELS = {
    "情境載入中",
    "需求已由後端接收",
    "管理已送出的需求",
    "繼續上次閱讀",
}
# 內容頁在前、首頁最後：同分時內容段落排在首頁出口卡之前。
PAGES = [
    "why.html",
    "visa.html",
    "prep.html",
    "simulator.html",
    "cost.html",
    "housing.html",
    "market.html",
    "work.html",
    "scam.html",
    "english.html",
    "health.html",
    "leave.html",
    "pr.html",
    "communities.html",
    "about.html",
    "index.html",
]
# 非繁中主線頁：固定頁名（以「（英文）」標示）與 href 基底。
EXTRA_PAGES = {
    "lang/en/visa/index.html": {"href": "lang/en/visa/", "pageTitle": "462 Work and Holiday（英文）"},
}
ALL_PAGES = PAGES + list(EXTRA_PAGES)
ALIASES = {
    "index.html": "澳洲打工度假 WHV 攻略 導覽 工具 搜尋",
    "why.html": "適不適合 自我探索 價值觀 心理 快思 慢想 決定 出發",
    "visa.html": "417 首簽 一簽 二簽 三簽 集簽 88天 179天 指定工作 郵遞區號",
    "prep.html": "出發 行李 TFN 銀行 開戶 手機 SIM 落地 清單",
    "simulator.html": "澳洲打工度假 模擬器 生存遊戲 抵澳30天 情境 租屋 找工作 payslip 緊急 預算",
    "cost.html": "生活費 薪水 存錢 稅 超市 便宜 吃飯 食譜 買車 二手車 PPSR 衣服 二手衣",
    "housing.html": "找房 訂房 住宿 hostel share house 合租 bond 押金 房租 看房",
    "market.html": "離澳 出清 初登澳 補給 二手 交換 拍賣 marketplace gumtree ebay 買賣",
    "work.html": "找工作 求職 履歷 CV 農場 雇主 薪資 欠薪 Fair Work 證照 白工",
    "scam.html": "詐騙 騙錢 欠薪 黑工 威脅 性騷擾 求助 報案 救濟",
    "english.html": "英文不好 英語 面試 工作 口說 聽力 學習",
    "health.html": "看醫生 GP 診所 急診 保險 Medicare 心理 壓力 受傷 緊急",
    "leave.html": "回台 離澳 報稅 tax 退休金 super DASP 退租 清單",
    "pr.html": "永居 移民 PR 雇主擔保 技術移民 留澳",
    "communities.html": "社團 社群 群組 找人 line facebook reddit 在地 認識 朋友 公開討論 微信",
    "about.html": "關於 合作 幫忙 聯絡 email 需求單 贊助 授權 免責 回饋",
    "lang/en/visa/index.html": "462 中國 大陸 抽籤 名額 Work and Holiday 學歷 英文",
}
# 意圖同義詞：以 12 頁 48 題 quick-answer 問題為單位（scratchpad site-seeds.md §A），每題 3–6 個口語寫法，
# 詞源為 questions.md §D 60 組（含台灣口語、中國用語、英文原詞與城市繁簡英對照）。
# key 是索引裡的 href；--check 會確認每個 key 都對得到一筆 entry。
INTENT_SYNONYMS = {
    # why.html
    "why.html#quick-title": "適不適合 我適合嗎 該不該去 值不值得 還缺什麼 準備好了嗎 8題快思",
    "why.html#slow-title": "想逃 逃離現狀 只是想逃 跟家人談 伴侶反對 父母反對 底線 退場方案 慢想",
    "why.html#after-reflection": "做完測驗 下一步 還是不確定 補資料",
    # visa.html
    "visa.html#first": "能不能申請 可以申請嗎 我能申請嗎 資格 年齡限制 幾歲 財力證明 存款證明 5000澳幣 打工度假簽證 WHV 打工簽 Working Holiday",
    "visa.html#apply": "怎麼申請 自己申請 送件 ImmiAccount 申請流程 申請步驟 体检 體檢 HAP",
    "visa.html#where": "算不算集簽 能不能集簽 指定工作 specified work 郵遞區號 postcode 農場簽 三個月農場 偏遠地區 regional",
    "visa.html#evidence": "集簽證明 雇主證明 1263 工作證明 payslip證明 二簽文件 留什麼證明 存證據",
    "visa.html#second": "二簽 三簽 集二簽 集簽 88天 179天 second visa third visa 2nd visa 農場簽 簽證到期 延簽 續簽 簽證過期 快到期 簽證快到了",
    "visa.html#counting": "88天怎麼算 天數怎麼算 集簽天數 算天數 二簽要幾天 三個月 六個月 幾天",
    "visa.html#sixmonth": "同一雇主 六個月限制 6個月 換老闆 換分店 8547 同雇主",
    "visa.html#protect": "欠薪 拖欠薪水 少給薪水 壓薪水 薪水沒給 薪水太低 underpayment wage theft 剝削 壓榨 拖欠工資 Fair Work FWO 檢舉老闆 投訴雇主 勞工局",
    # prep.html
    "prep.html#timeline": "簽證還沒下來 核准前 出發前準備 行前 時間軸 幾個月前 機票",
    "prep.html#72h": "剛落地 落地72小時 下飛機 第一天 剛到澳洲 落地第一週 初到",
    "prep.html#first-week": "三大號 三大件 門號 銀行開戶 TFN 稅號 tax file number myGov super 先辦哪個 落地三件事 電話卡 SIM eSIM",
    "prep.html#checklist": "行李清單 打包 帶什麼 漏東漏西 清單 checklist 行李 成藥",
    "prep.html#money": "錢怎麼帶 帶現金 帶多少現金 匯款過去 外幣帳戶",
    # cost.html
    "cost.html#cost-first-action": "薪水合法嗎 薪水合不合法 最低時薪 基本工資 minimum wage award PACT 時薪多少",
    "cost.html#wage": "薪水多少 時薪 一小時多少 casual 臨時工 薪資單 payslip 工資條 casual loading",
    "cost.html#math": "存得到錢嗎 存錢 存多少 收支 壓力測試 一週花多少 生活費 存不到錢 花費",
    "cost.html#budget": "沒錢 缺錢 錢不夠 帶多少錢 要帶多少錢 要帶多少 起步資金 沒錢了 錢花完 剛去要多少錢 澳幣 澳元 AUD",
    "cost.html#food": "吃飯省錢 吃什麼 泡麵 煮飯 超市 便宜 食材 省錢 伙食費 Coles Woolworths",
    "cost.html#car": "買車 賣車 買二手車 二手車 付款前 PPSR VIN 查車 過戶 rego 車況 查貸款 贓車 開車 駕照 強制險 CTP 車子 買車要注意什麼 NAATI 國際駕照 买车",
    "cost.html#exchange": "換匯 匯款 匯回台灣 匯回國 電匯 Wise 匯率 外幣帳戶",
    "cost.html#tax": "扣稅 稅率 退休金 super 養老金 backpacker tax 打工度假稅",
    # housing.html
    "housing.html#book": "短住 今晚住哪 沒地方住 落腳處 Airbnb 青旅 hostel 背包客棧 backpacker YHA 訂房 過渡住宿 短租 民宿",
    "housing.html#find": "share house 合租 分租 雅房 群租 合租房 sharehouse 整租 lease 租屋 租房 找房 租整間 室友",
    "housing.html#bond": "押金 bond 保證金 deposit 訂金 誠意金 先付押金 押金先給嗎 押金安全嗎 退押金",
    "housing.html#contract": "租約 agreement 合約看不懂 租金 修繕 退租 二房東 sublet 轉租 head tenant",
    # market.html
    "market.html#market-tool-title": "出清 賣東西 離澳出清 補齊生活用品 刊登草稿 二手交換 跳蚤 二手買賣",
    "market.html#platforms-title": "Gumtree Marketplace 二手平台 買二手 哪裡買二手 二手網站",
    "market.html#safety-title": "多匯一筆 先付訂金 交易詐騙 退款 假買家 溢付",
    # work.html
    "work.html#channels": "哪裡找工作 找不到工作 找工 求職平台 Seek Indeed 投履歷 工作去哪找 找工作 沒工作",
    "work.html#verify": "雇主合法嗎 這工合法嗎 這份工作合法嗎 查雇主 ABN 查核 offer 假工作 正規嗎 白工 合法工",
    "work.html#seasons": "這個月有什麼工作 採收季 季節 農場 採果 picking packing 包裝廠 果園 肉廠 meat works abattoir working hostel",
    "work.html#injury": "工作受傷 職災 工傷 現場不安全 workers compensation 受傷了",
    "work.html#certs": "證照 RSA 白卡 white card RSG forklift 堆高機 先考什麼",
    "work.html#resume": "履歷 resume CV cover letter 推薦人 reference 澳式履歷",
    # scam.html
    "scam.html#scam-first-action": "催匯款 催我匯款 催簽名 交證件 扣護照 先付錢 一直催",
    "scam.html#help": "已經匯款 匯款了 被騙了 被騙 資料外洩 帳號外洩 Scamwatch 通報 報案 檢舉詐騙 被騙怎麼辦",
    "scam.html#job": "黑工 現金工 cash job cash in hand 沒payslip 沒薪資單 先付費 繳押金 ABN領薪 假承攬 sham contracting 無薪試工 試工 unpaid trial 介紹費 黑中介",
    "scam.html#rent": "假房東 租屋詐騙 rental scam 看不到房 不讓看房 房東在國外 寄鑰匙 先付bond",
    "scam.html#chinese": "假移民局 假使館 公檢法 公检法 包裹詐騙 安全帳戶 假電話 冒充",
    # english.html
    "english.html#reality": "英文不好 英文很爛 英文差 英文不好可以去嗎 不會英文 英語不夠用 英文很差 英文爛",
    "english.html#before": "出發前練英文 練什麼 自我介紹 電話應答 時間不多 面試英文",
    "english.html#work-english": "工作要多少英文 英文程度 需要多少英文 英文要求 聽說讀寫",
    "english.html#after": "免費練英文 語言交換 圖書館 會話 語言學校 ELICOS 遊學 半工半讀",
    # health.html
    "health.html#emergency": "000 緊急電話 報警 救護車 生命危險 嚴重受傷 急診電話 緊急 出事",
    "health.html#health-first-action": "保險怎麼選 保險買哪邊 買保險 OVHC 旅平險 海外保險 打工度假保險",
    "health.html#insurance": "保險 OVHC Bupa Medibank 旅平險 意外險 台灣保險 保險買哪邊 保險買哪家 當地保險",
    "health.html#doctor": "看醫生 生病 GP 家庭醫生 診所 急診 urgent care healthdirect 掛號 bulk billing 生病看哪裡 看病",
    "health.html#mental": "心理 撐不住 憂鬱 焦慮 壓力 想家 崩潰 危機支援 Lifeline 孤單 想回家",
    "health.html#medicare": "Medicare 健保 澳洲健保 停保 公醫",
    # leave.html
    "leave.html#tax": "退稅 報稅 tax return myTax 報税 退税 財政年度 要不要報稅 ATO 退稅季",
    "leave.html#super": "super帳戶 好幾個super 整理super 退休金帳戶 合併 養老金 公積金",
    "leave.html#dasp": "DASP 領回退休金 super退款 離澳退休金 退養老金 super領回 領回super",
    "leave.html#checklist": "離澳清單 退租 關帳戶 離開澳洲 回台灣前 回台 收尾 回國",
    # pr.html
    "pr.html#overview": "PR 永居 綠卡 移民 留下來 拿身分 永久居留 留澳 公開路徑",
    "pr.html#employer": "雇主擔保 482 186 sponsor 提名 擔保簽證 老闆擔保",
    "pr.html#points": "技術移民 分數 EOI 189 190 491 州提名 skills assessment 偏遠地區 regional",
    "pr.html#reality": "找誰問 移民代理 OMARA RMA 律師 代辦",
    # index.html
    "index.html#communities-title": "社團 群組 群 LINE群 微信群 討論 同鄉會 伯斯 珀斯 Perth 墨爾本 墨尔本 Melbourne 布里斯本 布里斯班 Brisbane 雪梨 悉尼 Sydney 阿德雷德 阿德莱德 Adelaide 達爾文 达尔文 Darwin 荷巴特 霍巴特 Hobart 坎培拉 堪培拉 Canberra 黃金海岸 Gold Coast 凱恩斯 Cairns 塔斯 Tasmania 第一站 落地城市 去哪個城市",
    # lang/en/visa/
    "lang/en/visa/#choose": "462 抽籤 抽签 EOI ballot 名額 5000 中國護照 大陸 Work and Holiday 462抽籤 学历 學歷 Functional English 462签",
}


def compact(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def find_inactive_states(value: str) -> list[str]:
    return sorted(sentinel for sentinel in INACTIVE_UI_SENTINELS if sentinel in value)


def is_hub(href: str) -> bool:
    return bool(re.search(r"#(?:quick-answers|[a-z]+-first-action|exit-[a-z-]+)$", href))


class PageParser(HTMLParser):
    SKIP_TAGS = {"script", "style", "svg", "nav", "footer", "noscript"}
    VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self, page: str) -> None:
        super().__init__(convert_charrefs=True)
        self.page = page
        self.in_main = 0
        self.skip_depth = 0
        self.heading: dict[str, object] | None = None
        self.h1 = ""
        self.preface: list[str] = []
        self.sections: list[dict[str, object]] = []
        self.current: dict[str, object] | None = None
        self.entry: dict[str, object] | None = None
        self.entries: list[dict[str, object]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        if tag == "main":
            self.in_main += 1
            return
        if not self.in_main:
            return
        if self.skip_depth:
            if tag not in self.VOID_TAGS:
                self.skip_depth += 1
            return
        if tag in self.SKIP_TAGS or "data-search-ui" in attrs_dict or "hidden" in attrs_dict:
            if tag not in self.VOID_TAGS:
                self.skip_depth = 1
            return
        if self.entry is not None:
            if tag not in self.VOID_TAGS:
                self.entry["depth"] += 1
            return
        spec = attrs_dict.get("data-search-entry")
        if spec is not None:
            title, sep, anchor = str(spec).partition("|")
            title = compact(title)
            if not sep or not title or not anchor.startswith("#") or attrs_dict.get("id") != anchor[1:]:
                raise ValueError(f'{self.page}: data-search-entry must be "標題|#id" and the element must carry that id: {spec!r}')
            self.entry = {"title": title, "id": anchor[1:], "parts": [], "depth": 1}
            return
        if tag in {"h1", "h2"}:
            if tag == "h2":
                self.finish_section()
            self.heading = {"tag": tag, "id": attrs_dict.get("id", ""), "parts": []}

    def handle_endtag(self, tag: str) -> None:
        if not self.in_main:
            return
        if self.skip_depth:
            self.skip_depth -= 1
            return
        if self.entry is not None:
            self.entry["depth"] -= 1
            if self.entry["depth"] == 0:
                self.entries.append({
                    "title": str(self.entry["title"]),
                    "id": str(self.entry["id"]),
                    "text": compact(" ".join(self.entry["parts"])),
                })
                self.entry = None
            return
        if self.heading and tag == self.heading["tag"]:
            title = compact(" ".join(self.heading["parts"]))
            if tag == "h1":
                self.h1 = title
            elif title:
                self.current = {"title": title, "id": self.heading["id"], "parts": []}
            self.heading = None
        if tag == "main":
            self.finish_section()
            self.in_main -= 1

    def handle_data(self, data: str) -> None:
        if not self.in_main or self.skip_depth:
            return
        text = compact(data)
        if not text:
            return
        if self.entry is not None:
            self.entry["parts"].append(text)
        elif self.heading is not None:
            self.heading["parts"].append(text)
        elif self.current is not None:
            self.current["parts"].append(text)
        else:
            self.preface.append(text)

    def finish_section(self) -> None:
        if self.current is None:
            return
        text = compact(" ".join(self.current["parts"]))
        self.sections.append({"title": self.current["title"], "id": self.current["id"], "text": text})
        self.current = None


def meta_value(source: str, pattern: str, page: str) -> str:
    match = re.search(pattern, source, re.IGNORECASE | re.DOTALL)
    if not match:
        raise ValueError(f"{page}: missing metadata")
    return compact(match.group(1))


def make_entry(page: str, page_title: str, title: str, href: str, text: str, keywords: str) -> dict[str, object]:
    entry: dict[str, object] = {
        "page": page,
        "pageTitle": page_title,
        "title": title,
        "href": href,
        "text": text[:4000],
        "keywords": keywords,
    }
    synonyms = INTENT_SYNONYMS.get(href, "")
    if synonyms:
        entry["synonyms"] = synonyms
    if is_hub(href):
        entry["hub"] = 1
    return entry


def entries_for(page: str) -> list[dict[str, object]]:
    source = (ROOT / page).read_text(encoding="utf-8")
    parser = PageParser(page)
    parser.feed(source)
    parser.finish_section()
    title_tag = meta_value(source, r"<title>(.*?)</title>", page)
    description = meta_value(source, r'<meta name="description" content="(.*?)">', page)
    extra = EXTRA_PAGES.get(page)
    base_href = extra["href"] if extra else page
    page_title = extra["pageTitle"] if extra else (parser.h1 or re.sub(r"[｜|].*$", "", title_tag).strip())
    output = [
        make_entry(page, page_title, "本頁總覽", base_href, compact(description + " " + " ".join(parser.preface)), ALIASES[page]),
    ]
    for section in parser.sections:
        anchor = f"#{section['id']}" if section["id"] else ""
        output.append(make_entry(page, page_title, str(section["title"]), base_href + anchor, str(section["text"]), ""))
    for item in parser.entries:
        output.append(make_entry(page, page_title, str(item["title"]), base_href + "#" + str(item["id"]), str(item["text"]), ""))
    return output


def render() -> str:
    entries = []
    for page in ALL_PAGES:
        entries.extend(entries_for(page))
    payload = {"version": VERSION, "entries": entries}
    return "window.WHV_SEARCH_INDEX = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"


def check(current: str | None, expected: str) -> int:
    if current != expected:
        print("STALE SEARCH INDEX: run python scripts/build_search.py", file=sys.stderr)
        return 1
    payload = json.loads(current.removeprefix("window.WHV_SEARCH_INDEX = ").removesuffix(";\n"))
    entries = payload["entries"]
    pages = {entry["page"] for entry in entries}
    if pages != set(ALL_PAGES) or len(entries) < 100:
        print("INVALID SEARCH INDEX COVERAGE", file=sys.stderr)
        return 1
    shallow = [entry["href"] for entry in entries if entry["title"] != "本頁總覽" and "#" not in entry["href"]]
    if shallow:
        print("SEARCH SECTIONS MISSING ANCHORS: " + ", ".join(shallow), file=sys.stderr)
        return 1
    hrefs = {entry["href"] for entry in entries}
    unresolved = sorted(href for href in INTENT_SYNONYMS if href not in hrefs)
    if unresolved:
        print("INTENT SYNONYMS POINT TO MISSING ENTRIES: " + ", ".join(unresolved), file=sys.stderr)
        return 1
    if not all(entry.get("synonyms") for entry in entries if entry["href"] in INTENT_SYNONYMS):
        print("INTENT SYNONYMS NOT WRITTEN INTO INDEX", file=sys.stderr)
        return 1
    if len(INTENT_SYNONYMS) < 48:
        print("INTENT SYNONYMS TABLE SHORTER THAN 48 QUICK-ANSWER QUESTIONS", file=sys.stderr)
        return 1
    exits = [entry for entry in entries if entry["href"].startswith("index.html#exit-")]
    if len(exits) != 21 or not all(entry.get("hub") == 1 for entry in exits):
        print(f"CLARIFIER EXITS NOT INDEXED AS 21 HUB ENTRIES (found {len(exits)})", file=sys.stderr)
        return 1
    english = [entry for entry in entries if entry["page"] == "lang/en/visa/index.html"]
    if not english or english[0]["href"] != "lang/en/visa/" or english[0]["pageTitle"] != "462 Work and Holiday（英文）":
        print("ENGLISH 462 PAGE NOT INDEXED WITH FIXED PAGE TITLE", file=sys.stderr)
        return 1
    if "lang/en/visa/#choose" not in hrefs:
        print("ENGLISH 462 PAGE MISSING #choose ANCHOR", file=sys.stderr)
        return 1
    size = len(current.encode("utf-8"))
    if size > MAX_INDEX_BYTES:
        print(f"SEARCH INDEX TOO LARGE: {size} bytes > {MAX_INDEX_BYTES}", file=sys.stderr)
        return 1
    indexed_text = " ".join(
        f"{entry['pageTitle']} {entry['title']} {entry['text']} {entry.get('synonyms', '')}"
        for entry in entries
    )
    if find_inactive_states("prefix 情境載入中 suffix") != ["情境載入中"]:
        print("SEARCH INACTIVE-STATE SELF-TEST FAILED", file=sys.stderr)
        return 1
    leaked_states = find_inactive_states(indexed_text)
    if leaked_states:
        print("SEARCH INDEX CONTAINS INACTIVE UI: " + ", ".join(leaked_states), file=sys.stderr)
        return 1
    print(f"SEARCH INDEX CURRENT ({len(entries)} entries, {size} bytes)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = render()
    current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else None
    if args.check:
        return check(current, expected)
    OUTPUT.write_text(expected, encoding="utf-8", newline="\n")
    count = expected.count('"href":')
    print(f"SEARCH INDEX BUILT ({count} entries, {len(expected.encode('utf-8'))} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
