"""Offline regression tests of actual generated public reading outputs."""
import hashlib
import json
from pathlib import Path
import re
import unittest
from urllib.parse import urlsplit, unquote
from urllib.robotparser import RobotFileParser
import xml.etree.ElementTree as ET

from ai_reading import Tree, Reading, build_robots, decorate_page, reading_path, render_main, safe_url, walk, PRIVATE
import build_seo as seo
ROOT=Path(__file__).resolve().parent.parent
ORIGIN=seo.ORIGIN


def sample(inner):
    return '<html><head><title>not body</title></head><body><header>not body</header><main><h1>Title</h1><p>'+('public reading text '*10)+'</p>'+inner+'</main><footer>not body</footer></body></html>'


class Renderer(unittest.TestCase):
    def text(self, html):return render_main(sample(html), ORIGIN+'/visa.html')[0]

    def test_heading_permalink_and_absolute_links(self):
        text, sections, links=render_main(sample('<section id="apply"><h2>How</h2><a href="prep.html#first-week">Next</a></section>'),ORIGIN+'/visa.html')
        self.assertIn(ORIGIN+'/visa.html#apply', text)
        self.assertIn(ORIGIN+'/prep.html#first-week', links)
        self.assertEqual(sections[-1]['title'], 'How')

    def test_form_values_and_scripts_are_not_exported(self):
        s=self.text('<form><p>PRIVATE_FORM</p><input value="SECRET_VALUE"><textarea>SECRET_NOTE</textarea></form><script>SECRET_SCRIPT</script><style>SECRET_STYLE</style><template>SECRET_TEMPLATE</template>')
        for word in ('PRIVATE_FORM','SECRET_VALUE','SECRET_NOTE','SECRET_SCRIPT','SECRET_STYLE','SECRET_TEMPLATE'):self.assertNotIn(word,s)

    def test_hidden_subtrees_are_not_exported(self):
        s=self.text('<div hidden>NO_HIDDEN</div><p aria-hidden="true">NO_ARIA</p><div style="display: none">NO_STYLE</div><aside data-ai-exclude="true">NO_EXPORT</aside><p>VISIBLE</p>')
        for word in ('NO_HIDDEN','NO_ARIA','NO_STYLE','NO_EXPORT'):self.assertNotIn(word,s)
        self.assertIn('VISIBLE',s)

    def test_disclosures_and_collapsed_details_are_preserved(self):
        self.assertIn('SAFETY',self.text('<details><summary>Read limits</summary><p>SAFETY</p></details>'))

    def test_runtime_placeholders_and_listing_containers_excluded(self):
        s=self.text('<div class="result-grid">RUNTIME</div><p role="status">LOADING</p><div class="fb-list">LIVE_LISTING</div><div class="tool-row">CONTROL</div>')
        for x in ('RUNTIME','LOADING','LIVE_LISTING','CONTROL'):self.assertNotIn(x,s)

    def test_tables_keep_every_cell(self):
        text=self.text('<table><tr><th>Topic</th><th>Rule</th></tr><tr><td>Scope</td><td><strong>417 only</strong> and 462 separate</td></tr></table>')
        self.assertIn('| Topic | Rule |',text);self.assertIn('| --- | --- |',text);self.assertIn('**417 only** and 462 separate',text)

    def test_unsafe_and_private_urls_not_linked(self):
        for url in ('javascript:alert(1)','data:text/html,x','/api/case?token=x','/admin','/crm/x'):
            self.assertEqual(safe_url(url,ORIGIN+'/'), '')
        self.assertIn('Visible label',self.text('<a href="javascript:alert(1)">Visible label</a>'))

    def test_escaped_html_is_not_reinterpreted(self):
        self.assertIn('&lt;script&gt;', self.text('<p>&lt;script&gt;plain text&lt;/script&gt;</p>'))

    def test_foreign_image_not_exported_or_fetched(self):
        self.assertNotIn('tracking.invalid',self.text('<img src="https://tracking.invalid/pixel.png" alt="photo">'))

    def test_export_paths_reject_private_or_arbitrary_files(self):
        for path in ('../secrets.md','docs/SPEC.md','worker/src/index.ts','lang/fr/index.html'):
            with self.assertRaises(ValueError):reading_path(path)
        self.assertEqual(reading_path('free.html'),'ai/free.md')
        self.assertEqual(reading_path('lang/en/visa/index.html'),'ai/en/visa.md')

    def test_missing_main_fails_instead_of_exporting_whole_page(self):
        with self.assertRaises(ValueError):render_main('<p>secret body</p>',ORIGIN+'/')

    def test_decoration_is_idempotent_and_does_not_change_main(self):
        source=sample('<h2>Article</h2>');result=decorate_page('visa.html',source,ORIGIN)
        self.assertEqual(decorate_page('visa.html',result,ORIGIN),result)
        self.assertEqual(render_main(source,ORIGIN+'/visa.html'),render_main(result,ORIGIN+'/visa.html'))


class PublishedFiles(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index=json.loads((ROOT/'ai-index.json').read_text())
        cls.status=json.loads((ROOT/'content-status.json').read_text())
        cls.docs=cls.index['documents']

    def test_explicit_public_allowlist_only(self):
        self.assertEqual(len(self.docs),len(seo.PAGES)+len(seo.FULL_TRANSLATION_SLUGS))
        expected={ORIGIN+'/'+reading_path(p) for p in seo.PAGES}
        expected|={ORIGIN+'/ai/en/'+p+'.md' for p in seo.FULL_TRANSLATION_SLUGS}
        self.assertEqual({d['markdownUrl'] for d in self.docs},expected)
        self.assertNotIn('/404.html',{urlsplit(d['canonicalUrl']).path for d in self.docs})

    def test_every_manifest_hash_matches_bytes(self):
        for d in self.docs:
            data=(ROOT/urlsplit(d['markdownUrl']).path.lstrip('/')).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(),d['markdownSha256'])
            self.assertIn(d['canonicalUrl'].encode(),data)

    def test_source_review_scope_and_dates_unchanged(self):
        known={p['url']:p for k in ('primaryPages','fullEnglishGuides') for p in self.status[k]}
        for d in self.docs:
            original=known[d['canonicalUrl']]
            self.assertEqual(d['sourceContentLastModified'],original['lastModified'])
            self.assertEqual(d['evidenceCardCheckedAt'],original['evidenceCardCheckedAt'])
            self.assertEqual(d['evidenceCardScope'],original['evidenceCardScope'])
            self.assertEqual(d['reviewedByDomainProfessional'],False)
        self.assertEqual(known[ORIGIN+'/visa.html']['evidenceCardCheckedAt'],'2026-08-30')

    def test_section_urls_resolve_to_actual_anchors(self):
        for d in self.docs:
            path=urlsplit(d['canonicalUrl']).path.lstrip('/')
            if not path or path.endswith('/'):path+='index.html'
            ids={n.attrs.get('id') for n in walk(Tree((ROOT/path).read_text()).root)}
            for section in d['sections']:
                fragment=unquote(urlsplit(section['url']).fragment)
                if fragment:self.assertIn(fragment,ids,(path,fragment))

    def test_no_relative_or_unsafe_source_links(self):
        for d in self.docs:
            for link in d['sourceLinks']:
                self.assertIn(urlsplit(link).scheme,('https','http'))
                self.assertEqual(link,safe_url(link,d['canonicalUrl']))

    def test_official_sources_and_visa_qualification_preserved(self):
        text=(ROOT/'ai/visa.md').read_text()
        self.assertIn('https://immi.homeaffairs.gov.au/',text)
        self.assertIn('417',text);self.assertIn('462',text)
        self.assertIn('不代表整頁已由專業人士審校',text)
        self.assertIn('2026-08-30',text)

    def test_board_does_not_claim_live_stock_or_export_draft(self):
        text=(ROOT/'ai/free.md').read_text()
        self.assertIn('刊登與留言使用 GitHub 帳號',text)
        self.assertIn('不含表單、動態使用者刊登或試算結果',text)
        self.assertNotIn('尚未連線讀取',text)
        self.assertNotIn('fb-post-item',text)
        self.assertNotIn('目前 0 件',text)

    def test_discovery_links_exist_in_raw_html_and_llms(self):
        llms=(ROOT/'llms.txt').read_text()
        for d in self.docs:
            path=urlsplit(d['canonicalUrl']).path.lstrip('/')
            if not path or path.endswith('/'):path+='index.html'
            text=(ROOT/path).read_text()
            self.assertIn('type="text/markdown" href="'+d['markdownUrl']+'"',text)
            self.assertIn('<a href="'+d['markdownUrl']+'">',text)
            self.assertIn(d['markdownUrl'],llms)
        self.assertIn(ORIGIN+'/llms-full.txt',llms);self.assertIn(ORIGIN+'/ai-index.json',llms)

    def test_sitemap_and_manifest_modification_dates_agree(self):
        root=ET.fromstring((ROOT/'sitemap.xml').read_text())
        ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
        entries={r.find('s:loc',ns).text:r.find('s:lastmod',ns).text for r in root.findall('s:url',ns)}
        for d in self.docs:self.assertEqual(entries[d['canonicalUrl']],d['sourceContentLastModified'])

    def test_robots_preserves_private_routes_for_named_and_fallback_bots(self):
        rp=RobotFileParser();rp.parse((ROOT/'robots.txt').read_text().splitlines())
        for bot in ('Claude-SearchBot','Claude-User','ClaudeBot','Googlebot','OAI-SearchBot','OtherBot'):
            for path in ('/','/free.html','/ai/free.md','/llms-full.txt','/ai-index.json'):
                self.assertTrue(rp.can_fetch(bot,ORIGIN+path),(bot,path))
            for path in PRIVATE:self.assertFalse(rp.can_fetch(bot,ORIGIN+path+'example'),(bot,path))
        self.assertEqual(rp.site_maps(),[ORIGIN+'/sitemap.xml'])

    def test_combined_collection_contains_exact_copies(self):
        full=(ROOT/'llms-full.txt').read_text()
        for d in self.docs:self.assertIn((ROOT/urlsplit(d['markdownUrl']).path.lstrip('/')).read_text(),full)
        self.assertNotIn('PRIVATE_FORM',full)

    def test_builder_detects_stale_outputs(self):
        expected=seo.expected_files()
        for path,content in expected.items():self.assertEqual(path.read_text(),content,str(path))


if __name__=='__main__':unittest.main(verbosity=2)
