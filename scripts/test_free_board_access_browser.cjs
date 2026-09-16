/* Browser tests use local pages and controlled browser APIs; no real postings. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const QA=process.env.QA_DIR||'/tmp/free-board-access-qa';fs.mkdirSync(QA,{recursive:true});
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
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const results=[];const pass=name=>results.push(name);
  try{
    for(const width of [320,390,768,1280]){
      const c=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
      let api=0;const errors=[];
      await c.route('**/*',r=>{
        const u=new URL(r.request().url());
        if(u.origin===origin)return r.continue();
        if(u.hostname==='api.github.com'){api++;return r.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'[]'});}
        return r.abort();
      });
      await c.addInitScript(()=>{
        window.copied=[];window.shared=[];
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied.push(text);}}});
        Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.shared.push(data);}});
      });
      const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
      await p.goto(origin+'/index.html');await p.waitForSelector('.home-free-actions');
      assert.equal(await p.locator('.home-free-actions a').count(),2);
      assert.equal(await p.locator('#journey-map a').count(),4);
      const nav=await p.locator('.nav-links a[href="free.html"]').boundingBox();
      assert.ok(nav.x>=0 && nav.x+nav.width<=width,'free tab initially visible');
      const entry=await p.locator('.home-free-entry').boundingBox();
      assert.ok(entry.y<844,'entry begins in first viewport');
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      pass(width+': homepage entry, stage choices, visible nav and no overflow');
      if(width===390||width===1280)await p.screenshot({path:path.join(QA,'home-'+width+'.png')});
      await p.click('.home-free-actions a[href="free.html#publish"]');await p.waitForSelector('#fb-form:not([hidden])');
      assert.ok(p.url().endsWith('/free.html#publish'));assert.equal(await p.locator('.nav-links a[aria-current="page"]').textContent(),'免費二手');
      const pub=await p.locator('#publish').boundingBox();assert.ok(pub.y>=0&&pub.y<300,'deep link target visible');
      assert.equal(api,0);pass(width+': direct publish anchor and no unsolicited reads');
      const bar=p.locator('.fb-mobile-actions');assert.equal(await bar.isVisible(),width<=768);
      if(width<=768){
        await p.click('.fb-mobile-actions a[href="#free-board"]');await p.waitForFunction(()=>document.activeElement.id==='free-board');
        const bounds=await bar.boundingBox();assert.ok(bounds.y+bounds.height<=846);assert.ok(bounds.height<125);
        await p.click('.fb-mobile-actions a[href="#publish"]');await p.waitForFunction(()=>document.activeElement.id==='publish');
        await p.focus('#fb-post-item');assert.equal(await bar.isVisible(),false);
        await p.locator('#publish').focus();await p.waitForFunction(()=>!document.body.classList.contains('fb-editing'));
        assert.equal(await bar.isVisible(),true);pass(width+': mobile bar, anchor focus, keyboard protection');
      }
      await p.goto(origin+'/free.html#free-board?city=Perth%20WA&q=private&body=secret');await p.waitForSelector('#fb-share-controls:not([hidden])');
      assert.equal(await p.locator('#fb-city').inputValue(),'Perth WA');assert.equal(await p.locator('#fb-query').inputValue(),'');assert.equal(await p.locator('#fb-post-city').inputValue(),'');assert.equal(api,0);
      await p.fill('#fb-query','private search');await p.fill('#fb-post-details','private draft');
      await p.click('#fb-share-copy');await p.waitForFunction(()=>window.copied.length===1);
      assert.equal(await p.evaluate(()=>window.copied[0]),'https://www.aussiewhvcompass.com/free.html#free-board?city=Perth%20WA');
      await p.click('#fb-share-open');await p.waitForFunction(()=>window.shared.length===1);
      assert.deepEqual(await p.evaluate(()=>Object.keys(window.shared[0]).sort()),['title','url']);
      assert.equal(api,0);pass(width+': city-only link, draft privacy, clipboard and share dispatch');
      await p.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancel','AbortError');}});});
      await p.click('#fb-share-open');await p.waitForFunction(()=>document.getElementById('fb-share-message').textContent==='已取消分享。');assert.equal(await p.evaluate(()=>window.copied.length),1);
      pass(width+': cancelling share does not copy or claim completion');
      await p.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}});});
      await p.click('#fb-share-open');await p.waitForSelector('#fb-share-fallback:not([hidden])');assert.equal(await p.locator('#fb-share-url').inputValue(),'https://www.aussiewhvcompass.com/free.html#free-board?city=Perth%20WA');
      pass(width+': manual copy remains available after permission failure');
      await p.click('#fb-reset');assert.equal(await p.locator('#fb-city').inputValue(),'');assert.equal(await p.locator('#fb-share-fallback').isVisible(),false);
      await p.click('#fb-load');await p.waitForSelector('.fb-empty');assert.equal(api,1);pass(width+': reset and explicit inventory loading retained');
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);pass(width+': zero uncaught errors or horizontal overflow');
      if(width===390||width===1280){await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(QA,'free-'+width+'.png')});}
      await p.goto(origin+'/free.html#free-board?city=%3Cscript%3Ealert(1)%3C/script%3E');await p.waitForSelector('#fb-share-controls:not([hidden])');assert.equal(await p.locator('#fb-city').inputValue(),'');assert.equal(api,1);pass(width+': untrusted deep-link city ignored');
      await p.emulateMedia({media:'print'});assert.equal(await bar.isVisible(),false);pass(width+': print suppresses fixed bar');
      await c.close();
    }
    const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const p=await c.newPage();
    await p.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    await p.goto(origin+'/index.html');await p.click('.home-free-actions a[href="free.html#free-board"]');
    assert.ok(p.url().endsWith('free.html#free-board'));assert.equal(await p.locator('#fb-share-controls').isVisible(),false);assert.equal(await p.locator('.fb-mobile-actions').isVisible(),true);assert.equal(await p.getByText('直接使用 GitHub 免費贈送表單').isVisible(),true);pass('no-JS: navigation and fallback available');
    await p.goto(origin+'/lang/en/visa/');await p.click('a[href="/free.html"]');assert.ok(p.url().endsWith('free.html'));pass('English: direct Chinese-board entry works');
    await c.close();
    fs.writeFileSync(path.join(QA,'access-browser-results.json'),JSON.stringify({checks:results.length,results,limitations:['Controlled GitHub reads and mocked browser share/clipboard APIs','Not physical-device or actual OS/App sharing tests','No issue submissions']},null,2));
    console.log(results.length+' access browser checks passed');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
