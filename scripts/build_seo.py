#!/usr/bin/env python3
"""Build deterministic SEO discovery files and per-page JSON-LD."""

from __future__ import annotations

import argparse
import html
import json
import re
import struct
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://www.aussiewhvcompass.com"
LAST_MODIFIED = "2026-08-29"
LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hant"
OG_IMAGE = f"{ORIGIN}/assets/og-cover.png"
I18N_DATA = ROOT / "assets" / "i18n-locales.json"
FULL_TRANSLATION_URLS = [f"{ORIGIN}/lang/en/visa/", f"{ORIGIN}/lang/en/work/"]
PAGES = [
    "index.html",
    "why.html",
    "visa.html",
    "prep.html",
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

BEGIN = "<!-- SEO_DISCOVERY_BEGIN -->"
END = "<!-- SEO_DISCOVERY_END -->"


def page_url(page: str) -> str:
    return f"{ORIGIN}/" if page == "index.html" else f"{ORIGIN}/{page}"


def extract(pattern: str, source: str, page: str) -> str:
    match = re.search(pattern, source, re.IGNORECASE | re.DOTALL)
    if not match:
        raise ValueError(f"{page}: missing required head field for {pattern}")
    return html.unescape(match.group(1).strip())


def short_title(title: str) -> str:
    return re.sub(r"[｜|]\s*澳打指南針.*$", "", title).strip()


def seo_block(page: str, source: str) -> str:
    title = extract(r"<title>(.*?)</title>", source, page)
    description = extract(r'<meta name="description" content="(.*?)">', source, page)
    url = page_url(page)
    webpage = {
        "@type": "WebPage",
        "@id": f"{url}#webpage",
        "url": url,
        "name": title,
        "description": description,
        "inLanguage": "zh-Hant",
        "isPartOf": {"@id": f"{ORIGIN}/#website"},
        "isAccessibleForFree": True,
        "license": LICENSE_URL,
        "image": OG_IMAGE,
        "dateModified": LAST_MODIFIED,
    }
    graph = [
        {
            "@type": "WebSite",
            "@id": f"{ORIGIN}/#website",
            "url": f"{ORIGIN}/",
            "name": "澳打指南針",
            "alternateName": "Aussie WHV Compass",
            "description": "給台灣打工度假者的澳洲開源攻略與本地互動工具。",
            "inLanguage": "zh-Hant",
        },
        webpage,
    ]
    if page != "index.html":
        graph.append(
            {
                "@type": "BreadcrumbList",
                "@id": f"{url}#breadcrumb",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "澳打指南針",
                        "item": f"{ORIGIN}/",
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": short_title(title),
                        "item": url,
                    },
                ],
            }
        )
    structured = json.dumps(
        {"@context": "https://schema.org", "@graph": graph},
        ensure_ascii=False,
        indent=2,
    ).replace("</", "<\\/")
    return "\n".join(
        [
            BEGIN,
            '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">',
            '<meta property="og:site_name" content="澳打指南針">',
            f'<meta property="og:image" content="{OG_IMAGE}">',
            '<meta property="og:image:type" content="image/png">',
            '<meta property="og:image:width" content="1200">',
            '<meta property="og:image:height" content="630">',
            '<meta property="og:image:alt" content="澳打指南針：淡藍條紋與手繪檸檬風格的澳洲打工度假開源攻略">',
            '<meta name="twitter:card" content="summary_large_image">',
            f'<meta name="twitter:title" content="{html.escape(title, quote=True)}">',
            f'<meta name="twitter:description" content="{html.escape(description, quote=True)}">',
            f'<meta name="twitter:image" content="{OG_IMAGE}">',
            '<meta name="twitter:image:alt" content="澳打指南針：澳洲打工度假開源攻略">',
            f'<link rel="license" href="{LICENSE_URL}">',
            f'<link rel="alternate" type="text/markdown" href="{ORIGIN}/llms.txt" title="澳打指南針 AI 導覽">',
            '<script type="application/ld+json">',
            structured,
            "</script>",
            END,
        ]
    )


def update_page(page: str, source: str) -> str:
    block = seo_block(page, source)
    marked = re.compile(re.escape(BEGIN) + r".*?" + re.escape(END), re.DOTALL)
    if marked.search(source):
        return marked.sub(block, source, count=1)
    canonical = re.search(r'<link rel="canonical" href="[^"]+">', source)
    if not canonical:
        raise ValueError(f"{page}: missing canonical tag")
    return source[: canonical.end()] + "\n" + block + source[canonical.end() :]


def i18n_urls() -> list[str]:
    if not I18N_DATA.exists():
        return []
    data = json.loads(I18N_DATA.read_text(encoding="utf-8"))
    codes = sorted(code for code in data.get("locales", {}) if code != "zh-Hant")
    return [f"{ORIGIN}/lang/", *[f"{ORIGIN}/lang/{code}/" for code in codes], *FULL_TRANSLATION_URLS]


def build_sitemap() -> str:
    rows = []
    urls = [page_url(page) for page in PAGES] + i18n_urls()
    for url in urls:
        rows.extend(
            [
                "  <url>",
                f"    <loc>{url}</loc>",
                f"    <lastmod>{LAST_MODIFIED}</lastmod>",
                "  </url>",
            ]
        )
    return "\n".join(
        [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            *rows,
            "</urlset>",
            "",
        ]
    )


def build_llms(page_sources: dict[str, str]) -> str:
    groups = [
        ("開始前", ["why.html", "visa.html", "prep.html"]),
        ("在澳洲生活與工作", ["cost.html", "housing.html", "work.html", "scam.html", "english.html", "health.html"]),
        ("離開或留下", ["leave.html", "pr.html"]),
        ("關於與合作", ["about.html"]),
    ]
    lines = [
        "# 澳打指南針",
        "",
        "> 給台灣打工度假者的澳洲開源攻略與本地互動工具。內容以繁體中文撰寫，重要政策與數字附官方來源與查核日期。",
        "",
        "本站不是澳洲政府、移民代理、法律或醫療服務。政策、簽證、勞動權益與安全資訊應以各頁連結的官方來源為準；遇到不同說法時，請保留不確定性並引用原頁網址。",
        "",
        "## 首頁",
        "",
        f"- [澳打指南針]({ORIGIN}/): 全站旅程地圖、當下需求快導與互動工具入口。",
    ]
    for heading, pages in groups:
        lines.extend(["", f"## {heading}", ""])
        for page in pages:
            source = page_sources[page]
            title = short_title(extract(r"<title>(.*?)</title>", source, page))
            description = extract(r'<meta name="description" content="(.*?)">', source, page)
            lines.append(f"- [{title}]({page_url(page)}): {description}")
    lines.extend(
        [
            "",
            "## 使用與授權",
            "",
            f"- [Sitemap]({ORIGIN}/sitemap.xml): 全部可索引頁面與最後修改日期。",
            f"- [來源與免責]({ORIGIN}/about.html): 維護方式、授權、合作與免責說明。",
            f"- [GitHub 原始碼](https://github.com/jason201385-commits/aussie-whv-compass): 可檢視內容版本與提出修正。",
            f"- [多國語言 Quick Start]({ORIGIN}/lang/): 目前 417／462 護照國家的主要語言入口；機器翻譯需社群校對，官方來源優先。",
            f"- [English visa and specified-work guide]({ORIGIN}/lang/en/visa/): passport-neutral 417／462 guidance, a subclass 417 postcode checker and official source links; editorial beta, not government advice.",
            f"- [English work and workplace-rights guide]({ORIGIN}/lang/en/work/): job-search routes, employer and pay checks, harvest timing and official help paths; editorial beta, not legal or tax advice.",
            "- 文字內容採 CC BY-SA 4.0；程式碼採 MIT。轉載或改作時請註明澳打指南針與原頁網址，並遵守相同方式分享的授權條件。",
            "- 不要把社群經驗、估算值或互動工具輸出描述成官方判定；請保留頁面上的查核日期與限制。",
            "",
        ]
    )
    return "\n".join(lines)


def expected_files() -> dict[Path, str]:
    sources = {page: (ROOT / page).read_text(encoding="utf-8") for page in PAGES}
    output = {ROOT / page: update_page(page, sources[page]) for page in PAGES}
    output[ROOT / "sitemap.xml"] = build_sitemap()
    output[ROOT / "robots.txt"] = (
        "# All public content is crawlable. The sitemap is the canonical discovery list.\n"
        "User-agent: *\n"
        "Allow: /\n\n"
        f"Sitemap: {ORIGIN}/sitemap.xml\n"
    )
    output[ROOT / "llms.txt"] = build_llms(sources)
    return output


def validate_share_assets() -> list[str]:
    errors = []
    svg_path = ROOT / "assets" / "og-cover.svg"
    png_path = ROOT / "assets" / "og-cover.png"
    if not svg_path.exists():
        errors.append("missing assets/og-cover.svg")
    if not png_path.exists():
        errors.append("missing assets/og-cover.png")
        return errors
    header = png_path.read_bytes()[:24]
    if len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n":
        errors.append("assets/og-cover.png is not a PNG")
    else:
        width, height = struct.unpack(">II", header[16:24])
        if (width, height) != (1200, 630):
            errors.append(f"assets/og-cover.png is {width}x{height}, expected 1200x630")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if generated SEO files are stale")
    args = parser.parse_args()
    stale = []
    for path, expected in expected_files().items():
        current = path.read_text(encoding="utf-8") if path.exists() else None
        if current == expected:
            continue
        stale.append(path.relative_to(ROOT).as_posix())
        if not args.check:
            path.write_text(expected, encoding="utf-8", newline="\n")
    asset_errors = validate_share_assets()
    if args.check and (stale or asset_errors):
        if stale:
            print("STALE SEO FILES: " + ", ".join(stale), file=sys.stderr)
        for error in asset_errors:
            print("SEO ASSET ERROR: " + error, file=sys.stderr)
        return 1
    print(("SEO FILES CURRENT" if args.check else "SEO FILES BUILT") + f" ({len(PAGES)} pages)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
