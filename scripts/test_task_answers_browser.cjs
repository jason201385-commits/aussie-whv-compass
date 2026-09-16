/* Real local HTML interaction; external requests blocked, no real posting or account use. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const QA=process.env.QA_DIR||'/tmp/task-first-qa';fs.mkdirSync(QA,{recursive:true});
const server=http.createServer((req,res)=>{
  try{
    const u=new URL(req.url,'http://localhost');let pathname=decodeURIComponent(u.pathname);
    if(pathname.endsWith('/'))pathname+='index.html';const file=path.resolve(ROOT,'.'+pathname);
    if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
    const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml'};
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(fs.readFileSync(file));
  }catch(_){res.writeHead(404).end();}
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true});const checks=[];
  const pass=name=>{checks.push(name);fs.writeFileSync(path.join(QA,'task-browser-results.json'),JSON.stringify({passed:checks.length,checks,limitations:'Local HTTP browser checks with third parties blocked, not human usability research or real-device results.'},null,2));};
  async function context(options={}){
    const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',...options});
    const external=[],nonGet=[],errors=[];
    await c.route('**/*',route=>{
      const r=route.request();if(r.method()!=='GET'){nonGet.push(r.url());return route.abort();}
      if(new URL(r.url()).origin!==origin){external.push(r.url());return route.abort();}return route.continue();
    });
    const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));return {c,p,external,nonGet,errors};
  }
  const overflow=async p=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
  async function search(p,text){
    await p.click('.site-search-open');await p.fill('#site-search-input',text);
    await p.locator('#site-search-input').press('Enter');await p.waitForSelector('.task-search-answer');
  }
  try{
    for(const width of [320,390,1280]){
      const {c,p,external,nonGet,errors}=await context({viewport:{width,height:844}});
      await p.goto(origin+'/index.html');await p.waitForSelector('.site-search-open');
      assert.equal(await p.locator('.home-task-links a').count(),10);assert.equal(await p.locator('#journey-map a').count(),4);
      assert.equal(await p.locator('.home-task-links .chip-row a').count(),3);await overflow(p);pass(width+': native task choices coexist with four stages');
      await p.goto(origin+'/index.html#exit-considering-why');await p.waitForSelector('#exit-considering-why:not([hidden])');
      const city=p.locator('#exit-considering-why a[href="prep.html#first-city"]');assert.equal(await city.count(),1);await city.click();
      assert(p.url().endsWith('prep.html#first-city'));assert(await p.locator('[data-task-answer="first-city"]').isVisible());
      await p.click('[data-task-answer="first-city"] .task-actions a');assert(p.url().endsWith('#transport-planners'));assert.equal(await p.locator('.task-transit-links a').count(),8);pass(width+': city question leads to comparison and transport instead of introspection');
      await p.goto(origin+'/index.html');await search(p,'落地第一週');
      const box=p.locator('.task-search-answer');assert((await box.textContent()).includes('TFN 申請'));assert((await box.textContent()).includes('不是整頁或專業審校'));
      assert.equal(await box.locator('a[href="prep.html#first-week"]').count(),1);assert.equal(await p.locator('.site-search-results-list').count(),0);pass(width+': exact question exposes applicable short answer and its source');
      if(width===390)await p.screenshot({path:path.join(QA,'task-search-390.png')});
      await p.fill('#site-search-input','落地第一週私密詞SHOULDNOTLEAK');await p.locator('#site-search-input').press('Enter');await p.waitForFunction(()=>document.querySelector('.task-search-answer')===null);
      assert.equal(await p.locator('a[href*="SHOULDNOTLEAK"]').count(),0);assert.equal(nonGet.length,0);pass(width+': unknown additional conditions do not get a canned answer or leave in a link');
      await p.goto(origin+'/cost.html#runway-tool');await p.waitForSelector('#runway-form:not([hidden])');
      const before=await p.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));
      assert.equal(await p.locator('#runway-cash').inputValue(),'');await p.click('#runway-example');assert((await p.locator('#runway-status').textContent()).includes('不是建議金額'));
      await p.click('#runway-form button[type="submit"]');await p.waitForSelector('#runway-result:not([hidden])');
      assert((await p.locator('#runway-result').textContent()).includes('8.0 週'));assert((await p.locator('#runway-result').textContent()).includes('4,000.00'));pass(width+': explicit sample gives eight weeks without presuming income');
      if(width===390){await p.locator('#runway-tool').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(QA,'task-runway-390.png'),fullPage:false});}
      await p.selectOption('#runway-target','12');assert.equal(await p.locator('#runway-result').isVisible(),false);
      await p.click('#runway-form button[type="submit"]');assert((await p.locator('#runway-result').textContent()).includes('2,000.00'));pass(width+': target change clears old output and computes additional cash');
      await p.fill('#runway-weekly','0');assert.equal(await p.locator('#runway-result').isVisible(),false);await p.click('#runway-form button[type="submit"]');
      assert.equal(await p.locator('#runway-form').evaluate(e=>e.checkValidity()),false);assert.equal(await p.locator('#runway-result').isVisible(),false);pass(width+': invalid zero weekly cost cannot yield stale or infinite result');
      await p.click('#runway-reset');assert.equal(await p.locator('#runway-cash').inputValue(),'');assert.equal(await p.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}})),before);
      assert.equal(nonGet.length,0);assert.equal(external.filter(u=>/api\.github\.com|api\.aussiewhvcompass\.com/.test(u)).length,0);await overflow(p);assert.deepEqual(errors,[]);pass(width+': no amount persistence, unsolicited API call, uncaught error or overflow');
      await p.goto(origin+'/visa.html#where');assert(await p.locator('[data-task-answer="specified-work"]').isVisible());
      assert.equal(await p.locator('#specified-work-options a[href$="specified-work-462"]').count(),1);assert.equal(await p.locator('#specified-work-options a[href$="specified-work-417"]').count(),1);pass(width+': independent 417 and 462 official exits retained');
      await c.close();
    }
    const dated=await context();await dated.c.addInitScript(()=>{Date.now=()=>Date.parse('2026-12-17T00:00:00Z');});
    await dated.p.goto(origin+'/prep.html#first-week');await dated.p.waitForSelector('[data-task-answer="first-week"] [data-task-review-alert]:not([hidden])');
    assert.equal(await dated.p.locator('[data-task-answer="first-week"] [data-task-summary]').isVisible(),false);
    await search(dated.p,'落地第一週');assert((await dated.p.locator('.task-search-answer').textContent()).includes('已到複核日'));assert(!(await dated.p.locator('.task-search-answer').textContent()).includes('TFN 申請與銀行準備可分別進行'));
    pass('expired date: both card and search withhold old summary while preserving sources');await dated.c.close();
    const nojs=await context({javaScriptEnabled:false});
    await nojs.p.goto(origin+'/index.html');await nojs.p.click('.home-task-links a[href="cost.html#runway"]');
    assert(await nojs.p.locator('[data-task-answer="cash-runway"]').isVisible());assert.equal(await nojs.p.locator('#runway-form').isVisible(),false);assert((await nojs.p.locator('#runway-tool').textContent()).includes('公式：'));
    await nojs.p.locator('[data-task-answer="cash-runway"] details summary').click();assert(await nojs.p.locator('[data-task-answer="cash-runway"] a[href^="https://moneysmart"]').isVisible());await overflow(nojs.p);pass('no-JS: native routes, dates, sources and arithmetic formula remain accessible');
    await nojs.p.goto(origin+'/housing.html#bond-authorities');await nojs.p.locator('#bond-authorities summary').click();assert(await nojs.p.locator('#bond-authorities table').isVisible());pass('no-JS: state tenancy authorities can be opened without authentication');await nojs.c.close();
    console.log(checks.length+' task-first browser checks passed');
  }finally{await browser.close();server.close();}
})().catch(err=>{console.error(err);server.close();process.exitCode=1;});
