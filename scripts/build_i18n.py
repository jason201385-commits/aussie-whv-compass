#!/usr/bin/env python3
"""Build deterministic multilingual quick-start pages and language switcher."""

from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "assets" / "i18n-locales.json"
LANG_ROOT = ROOT / "lang"
SWITCHER_PATH = ROOT / "assets" / "i18n.js"
INDEX_PATH = ROOT / "index.html"
ORIGIN = "https://www.aussiewhvcompass.com"
ASSET_VERSION = "20260901-45"
GITHUB = "https://github.com/jason201385-commits/aussie-whv-compass"
INDEX_BEGIN = "<!-- I18N_DISCOVERY_BEGIN -->"
INDEX_END = "<!-- I18N_DISCOVERY_END -->"
GUIDES = [
    ("why", "/why.html"),
    ("visa", "/visa.html"),
    ("prep", "/prep.html"),
    ("cost", "/cost.html"),
    ("housing", "/housing.html"),
    ("work", "/work.html"),
    ("scam", "/scam.html"),
    ("english", "/english.html"),
    ("health", "/health.html"),
    ("leave", "/leave.html"),
    ("pr", "/pr.html"),
    ("collaborate", "/about.html#collaborate"),
]
FULL_GUIDE_TRANSLATIONS = {
    "en": {"visa": "/lang/en/visa/", "prep": "/lang/en/prep/", "cost": "/lang/en/cost/", "housing": "/lang/en/housing/", "work": "/lang/en/work/", "scam": "/lang/en/scam/", "health": "/lang/en/health/"},
}
FULL_TOPIC_ROUTES = {
    "visa": {"zh-Hant": "/visa.html", "en": "/lang/en/visa/"},
    "prep": {"zh-Hant": "/prep.html", "en": "/lang/en/prep/"},
    "cost": {"zh-Hant": "/cost.html", "en": "/lang/en/cost/"},
    "housing": {"zh-Hant": "/housing.html", "en": "/lang/en/housing/"},
    "work": {"zh-Hant": "/work.html", "en": "/lang/en/work/"},
    "scam": {"zh-Hant": "/scam.html", "en": "/lang/en/scam/"},
    "health": {"zh-Hant": "/health.html", "en": "/lang/en/health/"},
    "simulator": {"zh-Hant": "/simulator.html"},
}


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def load_data() -> dict:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"missing {DATA_PATH.relative_to(ROOT)}")
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    locales = data.get("locales", {})
    if "zh-Hant" not in locales or "en" not in locales:
        raise ValueError("i18n data must include zh-Hant and en")
    return data


def locale_url(code: str) -> str:
    return f"{ORIGIN}/" if code == "zh-Hant" else f"{ORIGIN}/lang/{code}/"


def sorted_codes(data: dict) -> list[str]:
    locales = data["locales"]
    priority = ["zh-Hant", "en", "zh-Hans", "es", "pt", "fr", "de", "ja", "ko"]
    rest = sorted((code for code in locales if code not in priority), key=lambda code: locales[code]["autonym"].casefold())
    return [code for code in priority if code in locales] + rest


def alternates(data: dict) -> str:
    links = [
        f'<link rel="alternate" hreflang="{esc(code)}" href="{esc(locale_url(code))}">'
        for code in sorted_codes(data)
        if data["locales"][code]["reviewStatus"] != "english-fallback"
    ]
    links.append(f'<link rel="alternate" hreflang="x-default" href="{ORIGIN}/lang/">')
    return "\n".join(links)


def build_base_index(data: dict) -> str:
    source = INDEX_PATH.read_text(encoding="utf-8")
    block = f"{INDEX_BEGIN}\n{alternates(data)}\n{INDEX_END}"
    start = source.find(INDEX_BEGIN)
    end = source.find(INDEX_END)
    if start >= 0 and end >= start:
        end += len(INDEX_END)
        return source[:start] + block + source[end:]
    marker = "</head>"
    if marker not in source:
        raise ValueError("index.html missing </head>")
    return source.replace(marker, block + "\n" + marker, 1)


def json_ld(url: str, title: str, description: str, language: str) -> str:
    payload = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "url": url,
        "name": title,
        "description": description,
        "inLanguage": language,
        "isAccessibleForFree": True,
        "isPartOf": {"@type": "WebSite", "url": f"{ORIGIN}/", "name": "Aussie WHV Compass"},
    }
    return json.dumps(payload, ensure_ascii=False, indent=2).replace("</", "<\\/")


def head(title: str, description: str, canonical: str, language: str, data: dict, noindex: bool = False) -> str:
    robots = "noindex,follow" if noindex else "index,follow,max-image-preview:large,max-snippet:-1"
    return f'''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{esc(canonical)}">
{alternates(data)}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Aussie WHV Compass">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{esc(canonical)}">
<meta property="og:image" content="{ORIGIN}/assets/og-cover.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{json_ld(canonical, title, description, language)}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&amp;family=Noto+Serif+TC:wght@700;900&amp;display=swap">
<link rel="stylesheet" href="/assets/style.css?v={ASSET_VERSION}">
<link rel="icon" href="data:image/svg+xml,&lt;svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c05621' stroke-width='2'&gt;&lt;circle cx='12' cy='12' r='10'/&gt;&lt;path d='M16 8l-2 6-6 2 2-6z'/&gt;&lt;/svg&gt;">'''


def header(home_label: str = "Aussie WHV Compass") -> str:
    return f'''<a class="skip-link" href="#main-content">Skip to content</a>
<header class="site-header">
  <nav class="nav-inner" aria-label="Primary">
    <a class="brand" href="/"><span class="logo" aria-hidden="true">A</span>{esc(home_label)}</a>
    <a class="language-hub-link" href="/lang/">All languages</a>
  </nav>
</header>'''


def footer(text: str) -> str:
    return f'''<footer class="site-footer"><div class="foot-inner">
  <p>{esc(text)}</p>
  <p class="disclaimer">A free, open-source guide. Official government sources always control.</p>
</div></footer>'''


def scripts() -> str:
    return f'''<script src="/assets/analytics-config.js?v={ASSET_VERSION}" defer></script>
<script src="/assets/analytics.js?v={ASSET_VERSION}" defer></script>
<script src="/assets/i18n.js?v={ASSET_VERSION}" defer></script>'''


def build_locale_page(code: str, locale: dict, data: dict) -> str:
    review = locale["reviewStatus"]
    is_fallback = review == "english-fallback"
    strings = data["locales"]["en"]["strings"] if is_fallback else locale["strings"]
    content_language = "en" if is_fallback else code
    content_direction = "ltr" if is_fallback else locale["direction"]
    canonical = locale_url(code)
    if is_fallback:
        page_title = f'{locale["englishName"]} translation unavailable — English safety fallback'
        intro = "This page intentionally shows the English source until a reviewed translation is available."
        if locale.get("fallbackReason") == "known-broken-machine-translation":
            translation_note = (
                f'The previous {locale["englishName"]} machine translation was removed because it contained '
                "mixed-language or unsafe-to-rely-on text. This page intentionally shows the English source. "
                "Visa, law, tax and medical details must be checked on the official Australian Government websites linked below."
            )
        else:
            translation_note = (
                f'A reviewed {locale["englishName"]} translation is not currently available. This page intentionally '
                "shows the English source. Visa, law, tax and medical details must be checked on the official "
                "Australian Government websites linked below."
            )
        eyebrow = (
            f'<span lang="{esc(code)}" dir="{esc(locale["direction"])}">{esc(locale["autonym"])}</span>'
            " · ENGLISH SAFETY FALLBACK"
        )
    else:
        page_title = strings["page_title"]
        intro = strings["intro"]
        translation_note = strings["translation_note"]
        eyebrow = esc(strings["eyebrow"])
    title = f'{page_title} | {strings["site_name"]}'
    full_routes = FULL_GUIDE_TRANSLATIONS.get(code, {})
    card_parts = []
    for key, href in GUIDES:
        traditional_target = code == "en" and key not in full_routes
        language_note = '<small>Traditional Chinese guide</small>' if traditional_target else ""
        language_attr = ' hreflang="zh-Hant"' if traditional_target else ""
        card_parts.append(
            f'<a class="card i18n-guide-card" href="{full_routes.get(key, href)}"{language_attr}><span class="i18n-guide-copy"><h3>{esc(strings[key])}</h3>{language_note}</span><span aria-hidden="true">→</span></a>'
        )
    cards = "\n".join(card_parts)
    review_label = "Machine translation — community review needed" if review.startswith("machine") else (
        "English safety fallback — translation unavailable" if review == "english-fallback" else "Source language"
    )
    return f'''<!DOCTYPE html>
<html lang="{esc(content_language)}" dir="{esc(content_direction)}">
<head>
{head(title, intro, canonical, content_language, data, noindex=is_fallback)}
</head>
<body class="i18n-page" data-locale="{esc(code)}">
{header(strings["site_name"])}
<main id="main-content" tabindex="-1">
  <section class="i18n-hero">
    <p class="section-eyebrow">{eyebrow}</p>
    <h1 class="page-title">{esc(page_title)}</h1>
    <p class="page-sub">{esc(intro)}</p>
    <p class="updated-tag">{esc(review_label)}</p>
  </section>
  <div class="warning i18n-translation-note"><strong>{esc(translation_note)}</strong></div>
  <section aria-labelledby="official-title">
    <h2 id="official-title">{esc(strings["eligibility_title"])}</h2>
    <p>{esc(strings["eligibility_text"])}</p>
    <div class="contact-route-actions">
      <a class="btn" href="{esc(data["officialSources"]["417"])}" target="_blank" rel="noopener noreferrer">{esc(strings["official_417"])}</a>
      <a class="btn secondary" href="{esc(data["officialSources"]["462"])}" target="_blank" rel="noopener noreferrer">{esc(strings["official_462"])}</a>
    </div>
    <p class="fact-meta">{esc(strings["source_checked"])}</p>
  </section>
  <section aria-labelledby="guide-title">
    <h2 id="guide-title">{esc(strings["guide_title"])}</h2>
    <p>{esc(strings["full_guide_note"])}</p>
    <div class="card-grid i18n-guide-grid">{cards}</div>
  </section>
  <div class="warn"><strong>{esc(strings["emergency"])}</strong></div>
  <section class="panel i18n-review">
    <h2>{esc(strings["community_review"])}</h2>
    <p><a href="{GITHUB}/issues/new?template=idea.yml&amp;title=%5Bi18n%5D%20{esc(code)}" target="_blank" rel="noopener noreferrer">GitHub</a></p>
    <p><a href="/">{esc(strings["chinese_home"])}</a></p>
  </section>
</main>
{footer(strings["site_name"])}
{scripts()}
</body>
</html>
'''


def build_hub(data: dict) -> str:
    locales = data["locales"]
    language_cards = []
    for code in sorted_codes(data):
        locale = locales[code]
        href = "/" if code == "zh-Hant" else f"/lang/{code}/"
        status = locale["reviewStatus"]
        badge = "source" if status == "source" else ("English fallback" if status == "english-fallback" else "machine translation")
        language_cards.append(
            f'<a class="card language-card" lang="{esc(code)}" dir="{esc(locale["direction"])}" href="{href}">'
            f'<h3>{esc(locale["autonym"])}</h3><p>{esc(locale["englishName"])}</p><small>{esc(badge)}</small></a>'
        )
    country_groups = []
    for subclass in ("417", "462"):
        rows = []
        for item in data["countries"]:
            if item["subclass"] != subclass:
                continue
            links = []
            for code in item["locales"]:
                locale = locales[code]
                href = "/" if code == "zh-Hant" else f"/lang/{code}/"
                links.append(f'<a lang="{esc(code)}" href="{href}">{esc(locale["autonym"])}</a>')
            rows.append(f'<tr><th scope="row">{esc(item["country"])}</th><td>{" · ".join(links)}</td></tr>')
        country_groups.append(
            f'<h2>Subclass {subclass}</h2><div class="table-wrap"><table><thead><tr><th>Passport country / jurisdiction</th><th>Available quick-start languages</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>'
        )
    title = "Languages for Australian Working Holiday travellers | Aussie WHV Compass"
    description = "Quick-start translations for the main languages used across current Australian subclass 417 and 462 passport countries and jurisdictions."
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
{head(title, description, f"{ORIGIN}/lang/", "en", data)}
</head>
<body class="i18n-page language-hub" data-locale="en">
{header()}
<main id="main-content" tabindex="-1">
  <p class="section-eyebrow">LANGUAGE ACCESS</p>
  <h1 class="page-title">Choose a language</h1>
  <p class="page-sub">Quick-start access for the main official or widely used languages across the passport countries and jurisdictions currently listed for subclass 417 or 462.</p>
  <div class="warning"><strong>Scope:</strong> this is broad primary-language coverage, not every regional language in highly multilingual countries. Machine translations need community review; official Australian Government sources always control.</div>
  <div class="card-grid language-grid">{"".join(language_cards)}</div>
  <section aria-labelledby="coverage-title">
    <h2 id="coverage-title">Country and language coverage</h2>
    <p>The passport list comes from the current first-visa eligibility pages. Language mapping is a practical reading aid, not a legal classification of official languages.</p>
    {"".join(country_groups)}
  </section>
</main>
{footer("Aussie WHV Compass language access")}
{scripts()}
</body>
</html>
'''


def build_switcher(data: dict) -> str:
    choices = []
    for code in sorted_codes(data):
        locale = data["locales"][code]
        choices.append({
            "code": code,
            "label": locale["autonym"],
            "url": "/" if code == "zh-Hant" else f"/lang/{code}/",
        })
    payload = json.dumps(choices, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    topic_routes = json.dumps(FULL_TOPIC_ROUTES, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return f'''(function () {{
  "use strict";
  var choices = {payload};
  var topicRoutes = {topic_routes};
  var nav = document.querySelector(".nav-inner");
  if (!nav || nav.querySelector(".language-picker")) return;
  var picker = document.createElement("form");
  picker.className = "language-picker";
  var text = document.createElement("span");
  text.className = "sr-only";
  text.textContent = "Language";
  var select = document.createElement("select");
  select.setAttribute("aria-label", "Language");
  var current = document.body.getAttribute("data-locale") || document.documentElement.lang || "zh-Hant";
  var topic = document.body.getAttribute("data-i18n-topic") || "";
  choices.forEach(function (choice) {{
    var option = document.createElement("option");
    option.value = topicRoutes[topic] && topicRoutes[topic][choice.code]
      ? topicRoutes[topic][choice.code]
      : choice.url;
    option.textContent = choice.label;
    option.lang = choice.code;
    option.selected = choice.code === current;
    select.appendChild(option);
  }});
  var go = document.createElement("button");
  go.type = "submit";
  go.className = "language-go";
  go.textContent = "Go";
  go.setAttribute("aria-label", "Go — open selected language");
  picker.addEventListener("submit", function (event) {{
    event.preventDefault();
    if (select.value) window.location.assign(select.value);
  }});
  picker.appendChild(text);
  picker.appendChild(select);
  picker.appendChild(go);
  var navLinks = nav.querySelector(".nav-links");
  nav.insertBefore(picker, navLinks || null);
}})();
'''


def expected_outputs(data: dict) -> dict[Path, str]:
    outputs = {
        LANG_ROOT / "index.html": build_hub(data),
        SWITCHER_PATH: build_switcher(data),
        INDEX_PATH: build_base_index(data),
    }
    for code, locale in data["locales"].items():
        if code == "zh-Hant":
            continue
        outputs[LANG_ROOT / code / "index.html"] = build_locale_page(code, locale, data)
    return outputs


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        data = load_data()
        outputs = expected_outputs(data)
    except Exception as exc:  # noqa: BLE001
        print(f"I18N BUILD FAILED: {exc}", file=sys.stderr)
        return 1
    stale = []
    for path, content in outputs.items():
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != content:
                stale.append(str(path.relative_to(ROOT)))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8", newline="\n")
    expected_dirs = {path.parent.resolve() for path in outputs if path.parent != LANG_ROOT}
    if LANG_ROOT.exists():
        extras = [p for p in LANG_ROOT.iterdir() if p.is_dir() and p.resolve() not in expected_dirs]
        stale.extend(str(p.relative_to(ROOT)) for p in extras)
    if stale:
        print("I18N FILES STALE: " + ", ".join(stale), file=sys.stderr)
        return 1
    print(f"I18N FILES {'CURRENT' if args.check else 'BUILT'} ({len(data['locales'])} locales, {len(data['countries'])} countries)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
