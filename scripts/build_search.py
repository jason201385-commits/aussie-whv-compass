#!/usr/bin/env python3
"""Build a same-origin, client-side search index from the public HTML pages."""

from __future__ import annotations

import argparse
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets" / "search-index.js"
VERSION = "2026-08-29"
INACTIVE_UI_SENTINELS = {
    "情境載入中",
    "需求已由後端接收",
    "管理已送出的需求",
    "繼續上次閱讀",
}
PAGES = [
    "index.html",
    "why.html",
    "visa.html",
    "prep.html",
    "simulator.html",
    "cost.html",
    "housing.html",
    "work.html",
    "scam.html",
    "english.html",
    "health.html",
    "leave.html",
    "pr.html",
    "about.html",
]
ALIASES = {
    "index.html": "澳洲打工度假 WHV 攻略 導覽 工具 搜尋",
    "why.html": "適不適合 自我探索 價值觀 心理 快思 慢想 決定 出發",
    "visa.html": "417 首簽 一簽 二簽 三簽 集簽 88天 179天 指定工作 郵遞區號",
    "prep.html": "出發 行李 TFN 銀行 開戶 手機 SIM 落地 清單",
    "simulator.html": "澳洲打工度假 模擬器 生存遊戲 抵澳30天 情境 租屋 找工作 payslip 緊急 預算",
    "cost.html": "生活費 薪水 存錢 稅 超市 便宜 吃飯 食譜 買車 二手車 PPSR 衣服 二手衣",
    "housing.html": "找房 訂房 住宿 hostel share house 合租 bond 押金 房租 看房",
    "work.html": "找工作 求職 履歷 CV 農場 雇主 薪資 欠薪 Fair Work 證照 白工",
    "scam.html": "詐騙 騙錢 欠薪 黑工 威脅 性騷擾 求助 報案 救濟",
    "english.html": "英文不好 英語 面試 工作 口說 聽力 學習",
    "health.html": "看醫生 GP 診所 急診 保險 Medicare 心理 壓力 受傷 緊急",
    "leave.html": "回台 離澳 報稅 tax 退休金 super DASP 退租 清單",
    "pr.html": "永居 移民 PR 雇主擔保 技術移民 留澳",
    "about.html": "關於 合作 幫忙 聯絡 email 需求單 贊助 授權 免責 回饋",
}


def compact(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def find_inactive_states(value: str) -> list[str]:
    return sorted(sentinel for sentinel in INACTIVE_UI_SENTINELS if sentinel in value)


class PageParser(HTMLParser):
    SKIP_TAGS = {"script", "style", "svg", "nav", "footer", "noscript"}
    VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_main = 0
        self.skip_depth = 0
        self.heading: dict[str, object] | None = None
        self.h1 = ""
        self.preface: list[str] = []
        self.sections: list[dict[str, object]] = []
        self.current: dict[str, object] | None = None

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
        if self.heading is not None:
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


def entries_for(page: str) -> list[dict[str, str]]:
    source = (ROOT / page).read_text(encoding="utf-8")
    parser = PageParser()
    parser.feed(source)
    parser.finish_section()
    title_tag = meta_value(source, r"<title>(.*?)</title>", page)
    description = meta_value(source, r'<meta name="description" content="(.*?)">', page)
    page_title = parser.h1 or re.sub(r"[｜|].*$", "", title_tag).strip()
    output = [
        {
            "page": page,
            "pageTitle": page_title,
            "title": "本頁總覽",
            "href": page,
            "text": compact(description + " " + " ".join(parser.preface))[:4000],
            "keywords": ALIASES[page],
        }
    ]
    for section in parser.sections:
        anchor = f"#{section['id']}" if section["id"] else ""
        output.append(
            {
                "page": page,
                "pageTitle": page_title,
                "title": str(section["title"]),
                "href": page + anchor,
                "text": str(section["text"])[:4000],
                "keywords": "",
            }
        )
    return output


def render() -> str:
    entries = []
    for page in PAGES:
        entries.extend(entries_for(page))
    payload = {"version": VERSION, "entries": entries}
    return "window.WHV_SEARCH_INDEX = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = render()
    current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else None
    if args.check:
        if current != expected:
            print("STALE SEARCH INDEX: run python scripts/build_search.py", file=sys.stderr)
            return 1
        payload = json.loads(current.removeprefix("window.WHV_SEARCH_INDEX = ").removesuffix(";\n"))
        hrefs = {entry["page"] for entry in payload["entries"]}
        if hrefs != set(PAGES) or len(payload["entries"]) < 100:
            print("INVALID SEARCH INDEX COVERAGE", file=sys.stderr)
            return 1
        shallow = [entry["href"] for entry in payload["entries"] if entry["title"] != "本頁總覽" and "#" not in entry["href"]]
        if shallow:
            print("SEARCH SECTIONS MISSING ANCHORS: " + ", ".join(shallow), file=sys.stderr)
            return 1
        indexed_text = " ".join(
            f"{entry['pageTitle']} {entry['title']} {entry['text']}"
            for entry in payload["entries"]
        )
        if find_inactive_states("prefix 情境載入中 suffix") != ["情境載入中"]:
            print("SEARCH INACTIVE-STATE SELF-TEST FAILED", file=sys.stderr)
            return 1
        leaked_states = find_inactive_states(indexed_text)
        if leaked_states:
            print("SEARCH INDEX CONTAINS INACTIVE UI: " + ", ".join(leaked_states), file=sys.stderr)
            return 1
        print(f"SEARCH INDEX CURRENT ({len(payload['entries'])} entries)")
        return 0
    OUTPUT.write_text(expected, encoding="utf-8", newline="\n")
    print(f"SEARCH INDEX BUILT ({sum(len(entries_for(page)) for page in PAGES)} entries)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
