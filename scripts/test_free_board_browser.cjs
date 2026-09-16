/* Real Chromium UI checks with mocked public GitHub reads; no real posts. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const core = require('../assets/free-board.js');
const root = path.resolve(__dirname, '..');
const qa = process.env.QA_DIR || '/tmp/free-board-qa';
fs.mkdirSync(qa,{recursive:true});
const data = {item:'電鍋（測試資料，不是真實刊登）',city:'Perth WA',category:core.CATEGORIES[0],condition:core.CONDITIONS[1],deadline:core.today(Date.now()+86400000),pickup:'Perth CBD 公共場所',details:'<img src=x onerror="window.injected=1"> 純文字安全測試'};
function listing(n){return {number:n,title:'[免費贈送] 測試',state:'open',labels:['free-board-approved'],created_at:new Date().toISOString(),body:new URL(core.draftUrl(data,true).url).searchParams.get('body')};}
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const rel=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const bytes=fs.readFileSync(file);const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain'}).end(bytes);}catch(e){res.writeHead(404).end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true});
  let checks=0;
  try{
    for(const width of [1280,390]){
      const context=await browser.newContext({viewport:{width,height:844}});
      let calls=0,mode='ok';const errors=[];
      await context.route('**/*',async route=>{
        const u=new URL(route.request().url());
        if(u.origin===origin)return route.continue();
        if(u.hostname==='api.github.com'){
          calls++;
          if(mode==='error')return route.fulfill({status:403,contentType:'application/json',body:'{"message":"rate limited"}'});
          const next=u.searchParams.get('page')==='2';
          return route.fulfill({status:200,contentType:'application/json',headers:next?{}:{Link:'<https://api.github.com/next>; rel="next"'},body:JSON.stringify(next?[listing(3)]:[listing(2),Object.assign(listing(4),{state:'closed'})])});
        }
        return route.abort();
      });
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(origin+'/free.html');
      await page.waitForSelector('#fb-form:not([hidden])');
      assert.equal(calls,0,'No public API request before explicit load');checks++;
      await page.click('#fb-load');await page.waitForSelector('.fb-card');
      assert.equal(await page.locator('.fb-card').count(),1);assert.equal(await page.locator('.fb-card img').count(),0);assert.equal(await page.evaluate(()=>window.injected),undefined);checks++;
      await page.selectOption('#fb-city','Sydney NSW');assert.equal(await page.locator('.fb-card').count(),0);
      await page.click('#fb-reset');assert.equal(await page.locator('.fb-card').count(),1);assert.equal(calls,1,'Filters remain local');checks++;
      await page.click('#fb-more');await page.waitForFunction(()=>document.querySelectorAll('.fb-card').length===2);assert.equal(await page.locator('#fb-more').isVisible(),false);checks++;
      await page.fill('#fb-post-item',data.item);await page.selectOption('#fb-post-city',data.city);await page.selectOption('#fb-post-category',data.category);await page.selectOption('#fb-post-condition',data.condition);await page.fill('#fb-post-deadline',data.deadline);await page.fill('#fb-post-pickup',data.pickup);await page.fill('#fb-post-details',data.details);await page.check('#fb-consent');await page.click('#fb-form button[type=submit]');
      await page.waitForSelector('#fb-preview:not([hidden])');
      const link=new URL(await page.locator('#fb-open').getAttribute('href'));assert.equal(link.hostname,'github.com');assert.equal(core.parseSections(link.searchParams.get('body')).item,data.item);checks++;
      await page.fill('#fb-post-item','改過的物品');assert.equal(await page.locator('#fb-preview').isVisible(),false);assert.equal(await page.locator('#fb-open').getAttribute('href'),null);checks++;
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'No horizontal overflow');assert.deepEqual(errors,[]);checks++;
      await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(qa,width===390?'mobile.png':'desktop.png'),fullPage:true});
      mode='error';await page.reload();await page.click('#fb-load');await page.waitForFunction(()=>document.getElementById('fb-message').textContent.includes('限制讀取'));assert.equal(await page.locator('.fb-empty').count(),0,'Network failure is not an empty inventory');checks++;
      await context.close();
    }
    const nojs=await browser.newContext({javaScriptEnabled:false});const page=await nojs.newPage();
    await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    await page.goto(origin+'/free.html');assert.equal(await page.getByText('直接使用 GitHub 免費贈送表單').isVisible(),true);checks++;
    for(const name of ['index','market','leave']){await page.goto(origin+'/'+name+'.html');assert.ok(await page.locator('a[href="free.html"]').count()>0);checks++;}
    await nojs.close();
    fs.writeFileSync(path.join(qa,'browser-result.txt'),`${checks} real Chromium checks passed (1280px, 390px, no-JS). Mock GitHub reads only; no real issue submission or identity verification.\n`);
    console.log(`${checks} browser checks passed`);
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
