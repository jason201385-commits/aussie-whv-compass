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
LAST_MODIFIED = "2026-09-02"
ASSET_VERSION = "20260902-47"
LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hant"
OG_IMAGE = f"{ORIGIN}/assets/og-cover.png"
I18N_DATA = ROOT / "assets" / "i18n-locales.json"
FULL_TRANSLATION_SLUGS = ["visa", "prep", "cost", "housing", "work", "scam", "health"]
FULL_TRANSLATION_URLS = [f"{ORIGIN}/lang/en/{slug}/" for slug in FULL_TRANSLATION_SLUGS]
PAGES = [
    "index.html",
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
    "about.html",
]

BEGIN = "<!-- SEO_DISCOVERY_BEGIN -->"
END = "<!-- SEO_DISCOVERY_END -->"

RISK_LEVELS = {
    "visa.html": "high",
    "cost.html": "high",
    "housing.html": "high",
    "market.html": "high",
    "work.html": "high",
    "scam.html": "high",
    "health.html": "high",
    "leave.html": "high",
    "pr.html": "high",
    "prep.html": "medium",
    "simulator.html": "medium",
    "why.html": "medium",
}


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
        "publishingPrinciples": f"{ORIGIN}/crawler-policy.txt",
        "subjectOf": f"{ORIGIN}/content-status.json",
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
            "license": LICENSE_URL,
            "publishingPrinciples": f"{ORIGIN}/crawler-policy.txt",
            "sameAs": "https://github.com/jason201385-commits/aussie-whv-compass",
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
            f'<link rel="alternate" type="application/json" href="{ORIGIN}/content-status.json?v={ASSET_VERSION}" title="澳打指南針內容狀態">',
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
    codes = sorted(
        code
        for code, locale in data.get("locales", {}).items()
        if code != "zh-Hant" and locale.get("reviewStatus") != "english-fallback"
    )
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
        ("開始前", ["why.html", "visa.html", "prep.html", "simulator.html"]),
        ("在澳洲生活與工作", ["cost.html", "housing.html", "market.html", "work.html", "scam.html", "english.html", "health.html"]),
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
        f"- [澳打指南針]({ORIGIN}/): 首頁釐清器：依階段、護照與需求點選找到下一步；安全出口、各地社團與互動工具入口。",
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
            f"- [內容狀態]({ORIGIN}/content-status.json): 各語言頁的風險級別、編輯狀態、證據卡狀態與專業審校界線。",
            f"- [第三方關係登錄表]({ORIGIN}/third-party-register.json): 現行第三方入口、商業關係、查核狀態與更正紀錄。",
            f"- [Crawler policy]({ORIGIN}/crawler-policy.txt): 允許的公開內容用途，以及表單、API、CRM 與個資端點邊界。",
            f"- [來源與免責]({ORIGIN}/about.html): 維護方式、授權、合作與免責說明。",
            f"- [GitHub 原始碼](https://github.com/jason201385-commits/aussie-whv-compass): 可檢視內容版本與提出修正。",
            f"- [多國語言 Quick Start]({ORIGIN}/lang/): 目前 417／462 護照國家的主要語言入口；機器翻譯需社群校對，官方來源優先。",
            f"- [English visa and specified-work guide]({ORIGIN}/lang/en/visa/): passport-neutral 417／462 guidance, a subclass 417 postcode checker and official source links; editorial beta, not government advice.",
            f"- [English preparation and arrival guide]({ORIGIN}/lang/en/prep/): passport-neutral departure checks, border declarations, first-week setup and a private local checklist; editorial beta, not government or professional advice.",
            f"- [English cost-of-living and money guide]({ORIGIN}/lang/en/cost/): current wage and WHM tax references, a local savings planner, food, clothing, transport and used-car safety routes; editorial beta, not tax or financial advice.",
            f"- [English accommodation and renting guide]({ORIGIN}/lang/en/housing/): first-stay booking routes, inspection and bond safeguards, all eight state and territory authorities, work-linked housing and dispute preparation; editorial beta, not booking or legal advice.",
            f"- [English work and workplace-rights guide]({ORIGIN}/lang/en/work/): job-search routes, employer and pay checks, harvest timing and official help paths; editorial beta, not legal or tax advice.",
            f"- [English scam-safety and exploitation guide]({ORIGIN}/lang/en/scam/): job, visa, rental, identity and payment red flags, an English practice quiz and official reporting routes; editorial beta, not legal or emergency advice.",
            f"- [English healthcare, insurance and personal-safety guide]({ORIGIN}/lang/en/health/): Medicare and visitor-cover checks, care routing, medicines, workplace injury, mental-health and violence-support contacts; editorial beta, not medical, insurance, legal or emergency advice.",
            "- 文字內容採 CC BY-SA 4.0；程式碼採 MIT。轉載或改作時請註明澳打指南針與原頁網址，並遵守相同方式分享的授權條件。",
            "- 不要把社群經驗、估算值或互動工具輸出描述成官方判定；請保留頁面上的查核日期與限制。",
            "",
        ]
    )
    return "\n".join(lines)


def build_content_status(page_sources: dict[str, str]) -> str:
    data = json.loads(I18N_DATA.read_text(encoding="utf-8"))
    primary_pages = []
    for page in PAGES:
        source = page_sources[page]
        evidence = re.search(
            r'<section class="evidence-card" data-evidence-status="([^"]+)" '
            r'data-evidence-scope="([^"]+)"[\s\S]*?<time datetime="([^"]+)">',
            source,
        )
        risk_level = RISK_LEVELS.get(page, "general")
        page_review_status = "human-edited-unreviewed-by-domain-professional"
        evidence_status = (
            evidence.group(1)
            if evidence
            else "pending-rollout" if risk_level == "high" else "not-applicable"
        )
        evidence_scope = evidence.group(2) if evidence else "no-evidence-card"
        evidence_checked_at = evidence.group(3) if evidence else None
        primary_pages.append(
            {
                "url": page_url(page),
                "language": "zh-Hant",
                "title": short_title(extract(r"<title>(.*?)</title>", source, page)),
                "riskLevel": risk_level,
                "pageReviewStatus": page_review_status,
                "editorialStatus": page_review_status,
                "reviewedByDomainProfessional": False,
                "officialVerificationRequired": risk_level == "high",
                "evidenceCardStatus": evidence_status,
                "evidenceCardScope": evidence_scope,
                "evidenceCardCheckedAt": evidence_checked_at,
                "evidenceStatus": evidence_status,
                "evidenceCheckedAt": evidence_checked_at,
                "lastModified": LAST_MODIFIED,
            }
        )

    full_english_guides = []
    for slug in FULL_TRANSLATION_SLUGS:
        relative = f"lang/en/{slug}/index.html"
        source = (ROOT / relative).read_text(encoding="utf-8")
        page_review_status = "editorial-draft-unreviewed-by-native-domain-professional"
        evidence_status = "pending-rollout" if slug in {"visa", "cost", "housing", "work", "scam", "health"} else "not-applicable"
        full_english_guides.append(
            {
                "url": f"{ORIGIN}/lang/en/{slug}/",
                "language": "en",
                "title": short_title(extract(r"<title>(.*?)</title>", source, relative)),
                "riskLevel": RISK_LEVELS.get(f"{slug}.html", "medium"),
                "pageReviewStatus": page_review_status,
                "editorialStatus": page_review_status,
                "reviewedByDomainProfessional": False,
                "officialVerificationRequired": slug in {"visa", "cost", "housing", "work", "scam", "health"},
                "evidenceCardStatus": evidence_status,
                "evidenceCardScope": "no-evidence-card",
                "evidenceCardCheckedAt": None,
                "evidenceStatus": evidence_status,
                "evidenceCheckedAt": None,
                "lastModified": LAST_MODIFIED,
            }
        )

    quick_start_locales = []
    for code, locale in sorted(data.get("locales", {}).items()):
        if code == "zh-Hant":
            continue
        quick_start_locales.append(
            {
                "url": f"{ORIGIN}/lang/{code}/",
                "language": code,
                "autonym": locale.get("autonym"),
                "englishName": locale.get("englishName"),
                "reviewStatus": locale.get("reviewStatus"),
                "fallbackReason": locale.get("fallbackReason"),
                "scope": "quick-start",
                "officialVerificationRequired": True,
            }
        )

    manifest = {
        "schemaVersion": 2,
        "generatedAt": LAST_MODIFIED,
        "canonicalOrigin": ORIGIN,
        "siteEditorialStatus": "independent-open-source-community-guide",
        "isOfficialGovernmentService": False,
        "providesMigrationLegalMedicalOrTaxAdvice": False,
        "publicContentCrawlable": True,
        "formsApiCrmAndPersonalDataCrawlable": False,
        "license": {
            "content": LICENSE_URL,
            "code": "https://opensource.org/license/mit",
            "attributionRequired": True,
            "canonicalLinkRequested": True,
        },
        "statusVocabulary": {
            "checked": "Only the adjacent first-action evidence card and its official exit were checked on evidenceCardCheckedAt; this is not a whole-page or professional review.",
            "pending-rollout": "This high-risk page does not yet use the layered evidence-card component.",
            "not-applicable": "No high-risk evidence-card rollout is currently assigned to this page.",
            "first-action-only": "The evidence status applies only to the visible first-action card, not to every claim on the page.",
            "no-evidence-card": "No evidence-card scope is claimed for this page.",
            "human-edited-unreviewed-by-domain-professional": "Human-edited Traditional Chinese page not reviewed by a relevant domain professional.",
            "editorial-draft-unreviewed-by-native-domain-professional": "English editorial draft not reviewed by a native-speaking relevant domain professional.",
            "source": "Human-authored source-language quick start; not an official translation.",
            "machine-unreviewed": "Machine translation not yet reviewed by a fluent human.",
            "english-fallback": "English fallback is shown because a reviewed translation is not available.",
        },
        "legacyFieldPolicy": "editorialStatus, evidenceStatus and evidenceCheckedAt are retained for compatibility; use pageReviewStatus and evidenceCard* fields for scope-aware status.",
        "primaryPages": primary_pages,
        "fullEnglishGuides": full_english_guides,
        "quickStartCoverageVersion": data.get("version"),
        "quickStartLocales": quick_start_locales,
    }
    return json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"


def build_crawler_policy() -> str:
    return "\n".join(
        [
            "# Aussie WHV Compass crawler policy",
            "",
            f"Canonical site: {ORIGIN}/",
            f"Machine-readable content status: {ORIGIN}/content-status.json",
            f"Machine-readable third-party register: {ORIGIN}/third-party-register.json",
            f"Sitemap: {ORIGIN}/sitemap.xml",
            "",
            "## Public guide content",
            "",
            "Public HTML guide pages, llms.txt, sitemap.xml, content-status.json and third-party-register.json may be discovered, indexed, summarised and reasonably cited.",
            "Keep the canonical page URL, visible source dates, editorial status and uncertainty boundaries with any summary or citation.",
            "Do not present this independent guide, community experience, estimates or interactive-tool output as an Australian Government decision or professional advice.",
            "Text content is CC BY-SA 4.0 and code is MIT; reuse remains subject to those licences and attribution requirements.",
            "",
            "## Non-content and personal-data boundaries",
            "",
            "Do not submit or automate forms, create cases, enumerate identifiers, or crawl API, admin, CRM, confirmation, receipt or deletion endpoints.",
            "Do not collect form-submitted email addresses, form responses, case records, tokens or other personal data even if a future application error exposes them.",
            "The public robots.txt disallows these route families. Absence of a disallow rule never grants access to authenticated, private or personal data.",
            "",
            "## Freshness",
            "",
            "For visa, pay, tax, housing, work, health, safety and migration topics, inspect content-status.json and follow the adjacent official source before relying on a claim.",
            "A stale or pending-rollout status means the official source is the safe current route; it does not mean the old claim remains valid.",
            "",
        ]
    )


def expected_files() -> dict[Path, str]:
    sources = {page: (ROOT / page).read_text(encoding="utf-8") for page in PAGES}
    output = {ROOT / page: update_page(page, sources[page]) for page in PAGES}
    output[ROOT / "sitemap.xml"] = build_sitemap()
    output[ROOT / "robots.txt"] = (
        "# Public guide content is crawlable. Forms, APIs, CRM and personal-data routes are not content.\n"
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /api/\n"
        "Disallow: /admin/\n"
        "Disallow: /crm/\n"
        "Disallow: /contact/confirmation/\n"
        "Disallow: /contact/receipt/\n"
        "Disallow: /contact/delete/\n\n"
        f"Sitemap: {ORIGIN}/sitemap.xml\n"
    )
    output[ROOT / "llms.txt"] = build_llms(sources)
    output[ROOT / "content-status.json"] = build_content_status(sources)
    output[ROOT / "crawler-policy.txt"] = build_crawler_policy()
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
