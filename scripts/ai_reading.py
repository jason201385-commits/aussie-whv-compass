"""Deterministic public HTML -> reading Markdown. No network, JS, user data or AI rewrite.

Called by build_seo.py. Only its explicit public-page allowlist is exported.
The HTML remains the canonical source; dates and review status are never upgraded.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
from html import escape
from html.parser import HTMLParser
import json
import re
from urllib.parse import quote, urljoin, urlsplit

VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
SKIP = set('script style svg template noscript nav form input textarea select button output iframe canvas'.split())
PRIVATE = ('/api/', '/admin/', '/crm/', '/contact/confirmation/', '/contact/receipt/', '/contact/delete/')
BEGIN = '<!-- AI_READING_BEGIN -->'
END = '<!-- AI_READING_END -->'
FOOT_BEGIN = '<!-- AI_READING_FOOTER_BEGIN -->'
FOOT_END = '<!-- AI_READING_FOOTER_END -->'


@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)


class Tree(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=True)
        self.root = Node('root')
        self.stack = [self.root]
        self.feed(source)
        self.close()

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def walk(node):
    if isinstance(node, Node):
        yield node
        for child in node.children:
            yield from walk(child)


def excluded(node):
    style = re.sub(r'\s+', '', node.attrs.get('style', '') or '').lower()
    classes = set((node.attrs.get('class') or '').split())
    return (node.tag in SKIP or 'hidden' in node.attrs
            or node.attrs.get('aria-hidden') == 'true'
            or 'display:none' in style or 'visibility:hidden' in style
            or node.attrs.get('data-ai-exclude') == 'true'
            or node.attrs.get('role') == 'status'
            or bool(classes & {'tool-row', 'result-grid', 'result-verdict', 'fb-list'}))


def reading_path(page):
    if re.fullmatch(r'[a-z][a-z0-9-]*\.html', page):
        return 'ai/' + page.removesuffix('.html') + '.md'
    m = re.fullmatch(r'lang/en/([a-z][a-z0-9-]*)/index\.html', page)
    if m:
        return 'ai/en/' + m[1] + '.md'
    raise ValueError('Not an allowlisted guide path: ' + page)


def canonical_url(page, origin):
    if page == 'index.html':
        return origin + '/'
    return origin + '/' + (page.removesuffix('index.html') if page.startswith('lang/') else page)


def safe_url(href, base):
    if not isinstance(href, str) or not href.strip():
        return ''
    url = urljoin(base, href.strip())
    parsed = urlsplit(url)
    if parsed.scheme not in ('https', 'http') or not parsed.netloc:
        return ''
    if parsed.hostname == urlsplit(base).hostname and any(parsed.path.startswith(p) or parsed.path == p.rstrip('/') for p in PRIVATE):
        return ''
    return quote(url, safe=':/?#@!$&\'*,;=+-._~%')


def compact(text):
    return re.sub(r'\s+', ' ', text).strip()


def tidy(text):
    lines = [line.rstrip() for line in text.splitlines()]
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)).strip()


class Reading:
    def __init__(self, base):
        self.base = base
        self.sections = []
        self.links = []

    def render(self, node, anchor=None):
        if isinstance(node, str):
            # Escape source text, never turn HTML-looking strings into active markup.
            return re.sub(r'\s+', ' ', node).replace('\\', '\\\\').replace('[', '\\[').replace(']', '\\]').replace('<', '&lt;').replace('>', '&gt;')
        if excluded(node):
            return ''
        ident = node.attrs.get('id')
        anchor = ident or anchor
        tag = node.tag
        if tag == 'table':
            rows = []
            for row in walk(node):
                if row.tag != 'tr' or excluded(row):
                    continue
                cells = [compact(self.render(c, anchor)).replace('|', '\\|') for c in row.children if isinstance(c, Node) and c.tag in ('th', 'td') and not excluded(c)]
                if cells:
                    rows.append(cells)
            if not rows:
                return ''
            width = max(map(len, rows))
            rows = [r + [''] * (width-len(r)) for r in rows]
            result = ['| ' + ' | '.join(r) + ' |' for r in rows]
            result.insert(1, '| ' + ' | '.join(['---'] * width) + ' |')
            return '\n\n' + '\n'.join(result) + '\n\n'
        body = ''.join(self.render(child, anchor) for child in node.children)
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            title = compact(body)
            if not title:
                return ''
            url = self.base + ('#' + quote(anchor, safe='-._~') if anchor else '')
            self.sections.append({'title': re.sub(r'[*`]', '', title), 'url': url})
            return '\n\n' + '#' * int(tag[1]) + ' ' + title + '\n\n' + ('[Section permalink](' + url + ')\n\n' if anchor else '')
        if tag == 'a':
            href = safe_url(node.attrs.get('href'), self.base)
            text = compact(body)
            if href and text:
                self.links.append(href)
                return '[' + text + '](' + href + ')'
            return text
        if tag in ('strong', 'b'):
            return '**' + body.strip() + '**' if body.strip() else ''
        if tag in ('em', 'i'):
            return '*' + body.strip() + '*' if body.strip() else ''
        if tag == 'code':
            return '`' + body.strip().replace('`', '') + '`'
        if tag == 'pre':
            return '\n\n' + body.strip() + '\n\n'
        if tag == 'li':
            return '\n- ' + tidy(body).replace('\n', '\n  ') + '\n'
        if tag == 'dt':
            return '\n\n**' + body.strip() + '**\n'
        if tag == 'dd':
            return '\n' + body.strip() + '\n'
        if tag == 'br':
            return '\n'
        if tag == 'hr':
            return '\n\n---\n\n'
        if tag == 'img':
            return ''  # Never fetch or advertise a user-image URL.
        if tag in ('p', 'div', 'section', 'article', 'aside', 'main', 'ul', 'ol', 'dl', 'blockquote', 'details', 'summary', 'figure', 'figcaption'):
            return '\n\n' + body.strip() + '\n\n' if body.strip() else ''
        return body


def render_main(source, url):
    root = Tree(source).root
    mains = [n for n in walk(root) if n.tag == 'main']
    if len(mains) != 1:
        raise ValueError(url + ': expected exactly one main')
    reader = Reading(url)
    text = tidy(reader.render(mains[0])) + '\n'
    if len(text) < 100:
        raise ValueError(url + ': unexpectedly empty public reading text')
    return text, reader.sections, sorted(set(reader.links))


def decorate_page(page, source, origin):
    english = page.startswith('lang/en/')
    url = origin + '/' + reading_path(page)
    title = 'This page as Markdown' if english else '本頁純文字（Markdown）'
    index_title = 'AI reading index' if english else 'AI 閱讀索引'
    head = f'{BEGIN}\n<link rel="alternate" type="text/markdown" href="{url}" title="{title}">\n<link rel="alternate" type="application/json" href="{origin}/ai-index.json" title="{index_title}">\n{END}'
    footer = f'{FOOT_BEGIN}\n<p class="fact-meta"><a href="{url}">{title}</a> · <a href="{origin}/llms.txt">{index_title}</a></p>\n{FOOT_END}'
    for start, end, value, marker in [(BEGIN, END, head, '</head>'), (FOOT_BEGIN, FOOT_END, footer, '</footer>')]:
        pattern = re.compile(re.escape(start) + r'.*?' + re.escape(end), re.S)
        if pattern.search(source):
            source = pattern.sub(lambda _: value, source, count=1)
        elif marker in source:
            source = source.replace(marker, value + '\n' + marker, 1)
        else:
            raise ValueError(page + ': missing ' + marker)
    return source


def build_robots(origin):
    rules = ['Disallow: ' + p for p in PRIVATE] + ['Allow: /']
    # Named groups repeat restrictions: robots parsers do NOT inherit * rules.
    groups = ['# Public guides are readable; this is not authentication or a training licence.',
              '# Claude-SearchBot = search; Claude-User = user-directed retrieval.',
              '# Training bots retain the existing wildcard crawl policy; training preferences are separate.']
    for name in ['Claude-SearchBot', 'Claude-User', '*']:
        groups += ['', 'User-agent: ' + name, *rules]
    return '\n'.join(groups + ['', 'Sitemap: ' + origin + '/sitemap.xml', ''])


def build_assets(sources, status, origin):
    statuses = {p['url']: p for k in ('primaryPages', 'fullEnglishGuides') for p in status[k]}
    outputs, docs, full = {}, [], []
    for page, source in sources.items():
        url = canonical_url(page, origin)
        meta = statuses[url]
        body, sections, links = render_main(source, url)
        english = meta['language'] == 'en'
        labels = ('Canonical source', 'Language', 'Source content modification date (not a new fact check)', 'Editorial status', 'Evidence scope', 'Evidence checked') if english else ('原始網頁', '語言', '來源內容修改日期（不是本次事實查核）', '編輯狀態', '證據卡範圍', '證據卡查核日期')
        values = [url, meta['language'], meta['lastModified'], meta['pageReviewStatus'], meta['evidenceCardScope'], meta['evidenceCardCheckedAt'] or ('Not recorded' if english else '未記錄')]
        intro = '\n'.join('- ' + a + ': ' + str(b) for a, b in zip(labels, values))
        warning = ('Independent guide, not a government or professional determination. Official sources and the original page govern; this export is not a new review. Forms, live user listings and interactive results are omitted. No available-item count or generated calculator result is asserted.' if english else '本站為獨立編輯指南，不是政府或專業判定。請核對原頁相鄰官方來源；純文字匯出不代表重新查核。此版本不含表單、動態使用者刊登或試算結果，不能據此判斷物品庫存或個人資格。')
        text = '# ' + meta['title'] + '\n\n' + intro + '\n- License: CC BY-SA 4.0; original-page attribution required.\n\n> ' + warning + '\n\n' + body
        dest = reading_path(page)
        outputs[dest] = text
        docs.append({'canonicalUrl': url, 'markdownUrl': origin + '/' + dest, 'title': meta['title'], 'language': meta['language'],
                     'sourceContentLastModified': meta['lastModified'], 'reviewedByDomainProfessional': meta['reviewedByDomainProfessional'],
                     'riskLevel': meta['riskLevel'], 'evidenceCardScope': meta['evidenceCardScope'], 'evidenceCardCheckedAt': meta['evidenceCardCheckedAt'],
                     'markdownSha256': sha256(text.encode()).hexdigest(), 'sections': sections, 'sourceLinks': links})
        full.append(text)
    index = {'schemaVersion': 1, 'canonicalOrigin': origin, 'scope': 'Static reading extracts of primary Traditional Chinese pages and full English guides; no forms, live listings, private data or Quick Start translation expansion.',
             'freshnessPolicy': 'Dates are copied from content-status.json; generation does not claim new verification. Section evidence is not a whole-page professional review.',
             'publicListingPolicy': 'free.html explains the board; live items require an explicit GitHub read by the visitor and are not syndicated here.',
             'documents': docs}
    outputs['ai-index.json'] = json.dumps(index, ensure_ascii=False, indent=2) + '\n'
    outputs['llms-full.txt'] = '# 澳打指南針 / Aussie WHV Compass — public reading collection\n\n> Derived from public HTML only. Not a new fact check. Prefer each canonical page and its official sources. Forms, private data, live listings and interactive results are omitted.\n\n' + '\n\n---\n\n'.join(full)
    return outputs
