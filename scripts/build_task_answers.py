#!/usr/bin/env python3
"""Generate section-scoped answers from public answers.json; never fetch or infer facts.

Edit sourceCheckedAt only after reading the cited source. Generation is NOT review.
Run before build_search.py / build_seo.py. --check never changes files.
"""
from __future__ import annotations
import argparse
from datetime import date
import html
import json
from pathlib import Path
import re
from urllib.parse import urlsplit, urlencode

ROOT = Path(__file__).resolve().parent.parent
ALLOWED_STATUS = {'source-checked', 'site-checked', 'needs-review'}

def valid_url(url: str, *, internal: bool = False) -> bool:
    if not isinstance(url, str) or any(c in url for c in '\r\n\\'):
        return False
    u = urlsplit(url)
    if not u.scheme and not u.netloc:
        return bool(re.fullmatch(r'[a-z][a-z0-9-]*\.html(?:#[a-zA-Z0-9-]+)?', url))
    return not internal and u.scheme == 'https' and bool(u.hostname) and not u.username and not u.password and u.port in (None, 443)

def load(root: Path = ROOT) -> dict:
    data = json.loads((root / 'answers.json').read_text(encoding='utf-8'))
    if data.get('schemaVersion') != 1 or not isinstance(data.get('answers'), list):
        raise ValueError('Unsupported answers schema')
    ids, hrefs, queries = set(), set(), set()
    for key, source in data['sources'].items():
        if source.get('kind') not in ('official', 'site') or not valid_url(source.get('url')):
            raise ValueError(f'Invalid source: {key}')
        host = urlsplit(source['url']).hostname
        if source['kind'] == 'official' and not (host.endswith('.gov.au') or host == 'transportnsw.info'):
            raise ValueError(f'Official source hostname needs explicit review: {host}')
        if source['kind'] == 'site' and host != 'www.aussiewhvcompass.com':
            raise ValueError('Site source must be same-site')
    for a in data['answers']:
        if not re.fullmatch(r'[a-z][a-z0-9-]*', a['id']) or a['id'] in ids:
            raise ValueError('Invalid/duplicate answer id')
        if not valid_url(a['href'], internal=True) or '#' not in a['href'] or a['href'] in hrefs:
            raise ValueError('Invalid/duplicate answer destination')
        ids.add(a['id']); hrefs.add(a['href'])
        for k in ('question', 'summary', 'scope', 'conditions'):
            if not isinstance(a.get(k), str) or not a[k].strip() or len(a[k]) > 160:
                raise ValueError(f'Invalid {k}: {a["id"]}')
        checked, due = date.fromisoformat(a['sourceCheckedAt']), date.fromisoformat(a['reviewDue'])
        if due <= checked or a['status'] not in ALLOWED_STATUS or a['reviewedByDomainProfessional'] is not False:
            raise ValueError('Review date/status contract violated')
        if not valid_url(a['action']['href']) or not a['action']['label']:
            raise ValueError('Invalid action')
        if not a['sourceIds'] or any(x not in data['sources'] for x in a['sourceIds']):
            raise ValueError('Missing evidence source')
        if a['kind'] == 'site-feature' and a['status'] not in ('site-checked', 'needs-review'):
            raise ValueError('Site behavior is not government evidence')
        for q in a['queries']:
            # Same punctuation/space normalization as browser search. No partial or fuzzy rules.
            import unicodedata
            norm = re.sub(r'''[\s\-_.,，。！？!?、/\\()（）:：;；'"“”‘’]+''', '', unicodedata.normalize('NFKC', q).lower())
            if not norm or len(q) > 80:
                raise ValueError('Invalid query alias')
            if norm in queries:
                # Punctuation variants within one answer are harmless; cross-answer collisions are not.
                owner = next((b['id'] for b in data['answers'] if b['id'] != a['id'] and any(re.sub(r'''[\s\-_.,，。！？!?、/\\()（）:：;；'"“”‘’]+''', '', unicodedata.normalize('NFKC', v).lower()) == norm for v in b['queries'])), None)
                if owner:
                    raise ValueError(f'Ambiguous answer alias: {q}')
            queries.add(norm)
    return data

def e(value: str) -> str:
    return html.escape(value, quote=True)

def render_card(a: dict, sources: dict) -> str:
    source_links = '・'.join(f'<a href="{e(sources[x]["url"])}" rel="noopener noreferrer">{e(sources[x]["label"])}</a>' for x in a['sourceIds'])
    report = 'https://github.com/jason201385-commits/aussie-whv-compass/issues/new?' + urlencode({'template': 'report.yml', 'page': a['href'], 'title': '[答案卡] ' + a['question']})
    pending = a['status'] == 'needs-review'
    summary_hidden = ' hidden' if pending else ''
    alert_hidden = '' if pending else ' hidden'
    label = '本站功能核對' if a['kind'] == 'site-feature' else '本卡來源核對'
    return f'''<aside class="task-answer" data-task-answer="{a['id']}" data-search-ui data-review-status="{a['status']}" data-source-checked-at="{a['sourceCheckedAt']}" data-review-due="{a['reviewDue']}" aria-labelledby="task-{a['id']}-title">
  <h3 id="task-{a['id']}-title">{e(a['question'])}</h3>
  <p data-task-summary{summary_hidden}>{e(a['summary'])}</p>
  <p><strong>適用：</strong>{e(a['scope'])}</p>
  <p><strong>先核對：</strong>{e(a['conditions'])}</p>
  <p class="task-review-alert" data-task-review-alert{alert_hidden}>本卡待複核，先查看下方來源與完整適用條件，不把舊摘要當成現行規則。</p>
  <p class="task-actions"><a class="btn" href="{e(a['action']['href'])}" rel="noopener noreferrer">{e(a['action']['label'])}</a></p>
  <p class="task-review-date">{label}：<time datetime="{a['sourceCheckedAt']}">{a['sourceCheckedAt']}</time>・下次複核：<time datetime="{a['reviewDue']}">{a['reviewDue']}</time></p>
  <details><summary>依據、適用範圍與更正</summary><p class="fact-meta">來源：{source_links}｜{a['sourceCheckedAt']} 查核</p><p>只核對本卡所列來源或本站操作，不代表整頁已審校，亦非專業人士的個案判定。複核日期是維護排程，不保證之前沒有變更。</p><p><a href="{e(report)}" target="_blank" rel="noopener noreferrer">回報本卡問題（GitHub 公開）</a>；需登入，請勿附上證件、聯絡方式、薪資單或第三人資料。</p></details>
</aside>'''

def render_home(answers: list) -> str:
    byid = {a['id']: a for a in answers}
    primary = ['cash-runway', 'first-week', 'job-check']
    labels = ['錢能撐多久', '落地第一週', '接工作先查什麼']
    links = ''.join(f'<a class="chip" href="{e(byid[k]["href"])}">{e(label)}</a>' for k, label in zip(primary, labels))
    rest = ''.join(f'<a href="{e(a["href"])}">{e(a["question"])}</a>' for a in answers if a['id'] not in primary)
    return f'''<nav class="home-task-links" aria-label="直接找新手答案">
  <strong>知道要問什麼？直接看答案</strong><div class="chip-row">{links}</div>
  <details><summary>其他新手問題</summary><div class="home-task-more">{rest}</div></details>
</nav>'''

def expected_pages(data: dict, root: Path = ROOT) -> dict:
    pages = {}
    for a in data['answers']:
        page = a['href'].split('#')[0]
        source = pages.get(page, (root / page).read_text(encoding='utf-8'))
        start, end = f'<!-- TASK_ANSWER:{a["id"]}:BEGIN -->', f'<!-- TASK_ANSWER:{a["id"]}:END -->'
        pattern = re.compile(re.escape(start) + r'[\s\S]*?' + re.escape(end))
        if len(pattern.findall(source)) != 1:
            raise ValueError(f'Missing/duplicate answer slot: {a["id"]}')
        pages[page] = pattern.sub(lambda m: start+'\n'+render_card(a, data['sources'])+'\n'+end, source)
    source = (root / 'index.html').read_text(encoding='utf-8')
    pattern = re.compile(r'<!-- TASK_HOME_BEGIN -->[\s\S]*?<!-- TASK_HOME_END -->')
    if len(pattern.findall(source)) != 1:
        raise ValueError('Missing/duplicate home task slot')
    pages['index.html'] = pattern.sub(lambda m: '<!-- TASK_HOME_BEGIN -->\n'+render_home(data['answers'])+'\n<!-- TASK_HOME_END -->', source)
    return pages

def search_answer(a: dict, sources: dict) -> dict:
    """Compact same-source payload; only shown for an exact, curated whole query."""
    s = sources[a['sourceIds'][0]]
    return {k: a[k] for k in ('id','question','summary','scope','conditions','queries','status','sourceCheckedAt','reviewDue')} | {'action': a['action'], 'source': s}

def main() -> int:
    parser=argparse.ArgumentParser(); parser.add_argument('--check',action='store_true'); args=parser.parse_args()
    data=load(); stale=[]
    for page, expected in expected_pages(data).items():
        if args.check:
            if (ROOT/page).read_text(encoding='utf-8') != expected: stale.append(page)
        else: (ROOT/page).write_text(expected,encoding='utf-8',newline='\n')
    if stale:
        print('STALE TASK ANSWERS: '+', '.join(stale)); return 1
    print(f'TASK ANSWERS {"CURRENT" if args.check else "BUILT"} ({len(data["answers"])} cards)'); return 0
if __name__=='__main__': raise SystemExit(main())
