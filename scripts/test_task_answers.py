#!/usr/bin/env python3
"""Offline tests for the source registry and native task cards, not a policy audit."""
import copy
import json
from pathlib import Path
import re
import tempfile
import unittest
from urllib.parse import urlsplit
from html.parser import HTMLParser
import build_task_answers as b
import build_search as search

ROOT=Path(__file__).resolve().parent.parent
class Links(HTMLParser):
    def __init__(self,text):
        super().__init__();self.ids=[];self.links=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.append(d['id'])
        if tag=='a' and 'href' in d:self.links.append(d['href'])

class Tasks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.data=b.load();cls.answers=cls.data['answers']
    def bad(self,fn):
        data=copy.deepcopy(self.data);fn(data)
        with tempfile.TemporaryDirectory() as p:
            Path(p,'answers.json').write_text(json.dumps(data))
            with self.assertRaises((ValueError,KeyError,TypeError)):b.load(Path(p))
    def test_registry_ten_unique_tasks(self):
        self.assertEqual(len(self.answers),10);self.assertEqual(len({a['href'] for a in self.answers}),10)
    def test_native_slots_are_current(self):
        for p,text in b.expected_pages(self.data).items():self.assertEqual((ROOT/p).read_text(),text,p)
    def test_all_local_card_targets_exist_once(self):
        for a in self.answers:
            for href in [a['href'],a['action']['href']]:
                if href.startswith('https:'):continue
                p,anchor=href.split('#');self.assertEqual(Links((ROOT/p).read_text()).ids.count(anchor),1,href)
    def test_source_scope_preserved(self):
        for a in self.answers:
            card=b.render_card(a,self.data['sources']);self.assertIn('不代表整頁',card);self.assertIn('維護排程',card);self.assertFalse(a['reviewedByDomainProfessional'])
            for source in a['sourceIds']:self.assertIn(self.data['sources'][source]['url'].replace('&','&amp;'),card)
    def test_home_native_links(self):
        p=Links(b.render_home(self.answers));self.assertEqual(len(p.links),10);self.assertEqual(set(p.links),{a['href'] for a in self.answers})
    def test_city_route_not_introspection(self):
        text=(ROOT/'index.html').read_text();part=text.split('id="exit-considering-why"')[1].split('class="clarifier-exit"')[0]
        self.assertIn('href="prep.html#first-city"',part);self.assertIn('第一站去哪',text)
    def test_unsafe_url_rejected(self):
        for url in ['javascript:alert(1)','https://u:p@evil.example/','//evil.example/','https://ok.example:444/','../../file.html','https://evil.example/\n']:
            with self.subTest(url=url):self.assertFalse(b.valid_url(url))
    def test_official_source_cannot_silently_change_host(self):self.bad(lambda d:d['sources']['budget'].update(url='https://advertiser.example/'))
    def test_missing_source_rejected(self):self.bad(lambda d:d['answers'][0].update(sourceIds=['missing']))
    def test_invalid_date_rejected(self):self.bad(lambda d:d['answers'][0].update(sourceCheckedAt='2026-02-30'))
    def test_reversed_dates_rejected(self):self.bad(lambda d:d['answers'][0].update(reviewDue='2026-09-01'))
    def test_duplicate_card_rejected(self):self.bad(lambda d:d['answers'].append(copy.deepcopy(d['answers'][0])))
    def test_ambiguous_alias_rejected(self):self.bad(lambda d:d['answers'][1]['queries'].append('第一站去哪'))
    def test_unknown_review_status_rejected(self):self.bad(lambda d:d['answers'][0].update(status='verified-government'))
    def test_professional_review_not_invented(self):self.bad(lambda d:d['answers'][0].update(reviewedByDomainProfessional=True))
    def test_site_features_are_not_official_verification(self):self.bad(lambda d:d['answers'][-1].update(status='source-checked'))
    def test_html_escaped(self):
        a=copy.deepcopy(self.answers[0]);a['summary']='<img src=x onerror=alert(1)>'
        card=b.render_card(a,self.data['sources']);self.assertNotIn('<img',card);self.assertIn('&lt;img',card)
    def test_explicit_needs_review_is_fail_closed_without_js(self):
        a=copy.deepcopy(self.answers[0]);a['status']='needs-review';card=b.render_card(a,self.data['sources']);self.assertIn('data-task-summary hidden',card);self.assertIn('data-task-review-alert>',card)
    def test_417_and_462_separate_exits(self):
        text=(ROOT/'visa.html').read_text();self.assertIn('id="specified-work-options"',text)
        self.assertIn('specified-work-417',text);self.assertIn('specified-work-462',text)
    def test_no_false_tfn_order_tax_claim(self):
        text=(ROOT/'prep.html').read_text();self.assertNotIn('順序錯就被扣45%',text);self.assertNotIn('順序錯就被扣 45%',text)
        self.assertIn('不是順序不同就固定扣某一稅率',text);self.assertIn('my.gov.au',text)
    def test_cash_ui_has_no_native_submit_data(self):
        text=(ROOT/'cost.html').read_text();form=re.search(r'<form id="runway-form"[\s\S]*?</form>',text).group()
        self.assertIn('hidden',form);self.assertNotIn(' name=',form);self.assertNotIn(' action=',form)
        self.assertIn('data-ai-exclude="true"',text.split('id="runway-result"')[1].split('>')[0])
    def test_same_data_in_search(self):
        data=search.parse_index((ROOT/'assets/search-index.js').read_text(encoding='utf-8'))
        indexed={x['answer']['id']:x for x in data['entries'] if 'answer' in x}
        self.assertEqual(len(indexed),len(self.answers))
        for a in self.answers:self.assertEqual(indexed[a['id']]['answer'],b.search_answer(a,self.data['sources']))
    def test_search_encoding_preserves_all_entries_and_fields(self):
        # Compare the complete, formerly uncompressed payload, not selected search phrases.
        original=search.build_payload();before=copy.deepcopy(original)
        decoded=search.parse_index(search.render_payload(original))
        self.assertEqual(decoded,before)
        self.assertEqual(original,before,'encoding must not mutate the original entries')
        self.assertEqual(search.parse_index((ROOT/'assets/search-index.js').read_text(encoding='utf-8')),before)
        self.assertNotIn('pages',decoded)
        self.assertTrue(all(isinstance(x['page'],str) and isinstance(x['pageTitle'],str) for x in decoded['entries']))
    def test_shared_page_metadata_roundtrip_preserves_variations(self):
        one={'page':'same.html','pageTitle':'標題 "甲"','title':'一','href':'same.html#one','text':'完整內文\\與換行\n測試','keywords':'','synonyms':'同義詞','hub':1,'answer':{'queries':['原句'],'source':{'url':'https://example.org/','label':'來源'},'flag':False},'extra':[0,None,True]}
        two={**one,'title':'二','href':'same.html#two'}
        three={**one,'pageTitle':'同頁另一標題','title':'三','href':'same.html#three'}
        original={'version':'fixture','entries':[one,two,three]};before=copy.deepcopy(original)
        rendered=search.render_payload(original)
        encoded=json.loads(rendered[len(search.INDEX_PREFIX):-len(search.INDEX_SUFFIX)])
        self.assertEqual(len(encoded['pages']),2)
        self.assertEqual([x['page'] for x in encoded['entries']],[0,0,1])
        self.assertTrue(all('pageTitle' not in x for x in encoded['entries']))
        self.assertEqual(search.parse_index(rendered),before)
        self.assertEqual(original,before)
    def test_search_decoder_rejects_changed_wrapper_and_invalid_metadata(self):
        rendered=search.render_payload({'version':'fixture','entries':[{'page':'a.html','pageTitle':'甲','text':'原文'}]})
        for source in [rendered+'alert(1);',rendered.replace(search.INDEX_PREFIX,'other = ',1),rendered.replace(search.INDEX_SUFFIX,';\n')]:
            with self.subTest(source=source):
                with self.assertRaises(ValueError):search.parse_index(source)
        encoded=json.loads(rendered[len(search.INDEX_PREFIX):-len(search.INDEX_SUFFIX)])
        for page_id in [-1,1,True,0.0,'0',None]:
            bad=copy.deepcopy(encoded);bad['entries'][0]['page']=page_id
            with self.subTest(page_id=page_id):
                with self.assertRaises(ValueError):search.parse_index(search.INDEX_PREFIX+json.dumps(bad)+search.INDEX_SUFFIX)
        for pages in [None,{},[['a.html']],[['a.html',0]]]:
            bad=copy.deepcopy(encoded);bad['pages']=pages
            with self.subTest(pages=pages):
                with self.assertRaises(ValueError):search.parse_index(search.INDEX_PREFIX+json.dumps(bad)+search.INDEX_SUFFIX)
    def test_ai_reading_includes_dates_and_scope_not_inputs(self):
        cost=(ROOT/'ai/cost.md').read_text();self.assertIn('沒有收入',cost);self.assertIn('不代表整頁',cost)
        self.assertIn('2026-12-16',cost);self.assertNotIn('runway-cash-help',cost);self.assertNotIn('計算緩衝週數',cost)
    def test_fullpage_review_not_promoted(self):
        data=json.loads((ROOT/'content-status.json').read_text())
        for a in data['primaryPages']:
            self.assertIs(a['reviewedByDomainProfessional'],False)
            if a['evidenceCardStatus']=='checked':self.assertEqual(a['evidenceCardScope'],'first-action-only')
    def test_source_and_action_schemes_only(self):
        for a in self.answers:
            self.assertTrue(b.valid_url(a['action']['href']))
            for s in a['sourceIds']:self.assertEqual(urlsplit(self.data['sources'][s]['url']).scheme,'https')

if __name__=='__main__':unittest.main(verbosity=2)
