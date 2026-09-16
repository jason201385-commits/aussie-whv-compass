/* Uses production search core and pure cents arithmetic, never a network call. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {test}=require('node:test'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('answers.json'));const sandbox={window:{}};vm.runInNewContext(read('assets/search-index.js'),sandbox);
const entries=sandbox.window.WHV_SEARCH_INDEX.entries;
const main=read('assets/main.js');const core=main.split('// ==== search-core:start ====')[1].split('// ==== search-core:end ====')[0];
const scope={};vm.runInNewContext(core,scope);const {calculate}=require('../assets/cash-runway.js');
const sample={cash:'8000',oneoff:'1000',bond:'1000',reserve:'2000',weekly:'500',target:'8'};
for(const a of data.answers)test('curated whole question routes to '+a.id,()=>{
  for(const q of a.queries){const result=scope.runSiteSearch(entries,q);assert.equal(result.mode,'curated');assert.equal(result.matches[0].entry.href,a.href);}
});
test('extra unknown conditions cannot be mistaken for an exact answer',()=>{
  for(const q of ['第一站去哪但我的簽證被取消','462咖啡店可以集簽嗎','押金可以先付嗎我在日本','qzxvnotfound'])assert.notEqual(scope.runSiteSearch(entries,q).mode,'curated');
});
test('ambiguous aliases fail to general search instead of choosing one',()=>{
  const e=entries.filter(x=>x.answer);assert.equal(scope.findTaskAnswer([e[0],e[0]],e[0].answer.queries[0]),null);
});
test('date gate honors UTC+8 expiration boundary',()=>{
  const a={status:'source-checked',sourceCheckedAt:'2026-09-17',reviewDue:'2026-10-17'};
  assert.equal(scope.taskAnswerState(a,Date.parse('2026-10-16T15:59:59Z')),'dated-summary');
  assert.equal(scope.taskAnswerState(a,Date.parse('2026-10-16T16:00:00Z')),'needs-review');
});
test('missing invalid future reversed or explicit pending review never gets summary',()=>{
  const a={status:'source-checked',sourceCheckedAt:'2026-09-17',reviewDue:'2026-10-17'};
  for(const x of [null,{...a,status:'needs-review'},{...a,sourceCheckedAt:'2026-02-30'},{...a,reviewDue:'2026-09-16'},{...a,reviewDue:''},{...a,sourceCheckedAt:'2026-10-01'}])assert.equal(scope.taskAnswerState(x,Date.parse('2026-09-18')),'needs-review');
});
test('sample scenario exactly eight weeks',()=>{const x=calculate(sample);assert.equal(x.availableCents,400000);assert.equal(x.fullWeeks,8);assert.equal(x.tenthsOfWeek,80);assert.equal(x.targetGapCents,0);});
test('twelve-week target uses explicit additional cash not assumed earnings',()=>assert.equal(calculate({...sample,target:12}).targetGapCents,200000));
test('zero cash yields zero weeks and total gap',()=>{const x=calculate({...sample,cash:0});assert.equal(x.initialGapCents,400000);assert.equal(x.fullWeeks,0);assert.equal(x.targetGapCents,800000);});
test('reserve exceeding cash displays pre-expense deficit',()=>{const x=calculate({...sample,cash:100});assert.equal(x.availableCents,-390000);assert.equal(x.initialGapCents,390000);assert.equal(x.fullWeeks,0);});
test('decimal cents do not manufacture a full week',()=>{const x=calculate({cash:0.30,oneoff:0.10,bond:0,reserve:0,weekly:0.20,target:1});assert.equal(x.availableCents,20);assert.equal(x.fullWeeks,1);assert.equal(x.targetGapCents,0);});
test('fractional weeks rounded down, never exaggerating support',()=>{const x=calculate({...sample,cash:'8499.99'});assert.equal(x.fullWeeks,8);assert.equal(x.tenthsOfWeek,89);});
test('invalid amounts and zero recurring spend fail closed',()=>{
  for(const key of ['cash','oneoff','bond','reserve','weekly'])for(const value of ['',null,undefined,-1,NaN,Infinity,'1e5','1.001','<script>','100000000.01',true])assert.throws(()=>calculate({...sample,[key]:value}));
  assert.throws(()=>calculate({...sample,weekly:0}));assert.throws(()=>calculate(null));
});
test('only finite integer target weeks 1..52 accepted',()=>{
  for(const target of [0,53,-1,1.5,'',undefined,NaN,Infinity])assert.throws(()=>calculate({...sample,target}));
  assert.equal(calculate({...sample,target:52}).targetWeeks,52);
});
test('calculator ships without persistence or network APIs',()=>assert.doesNotMatch(read('assets/cash-runway.js'),/localStorage|sessionStorage|fetch\(|XMLHttpRequest|sendBeacon|location\.(?:search|hash)/));
test('search answer renderer uses authored fields not innerHTML',()=>{
  const renderer=main.split('var renderTaskSearchAnswer =')[1].split('var refreshTaskDates')[0];assert.doesNotMatch(renderer,/innerHTML/);assert.match(renderer,/textContent/);
});
