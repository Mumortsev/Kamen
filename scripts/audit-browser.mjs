import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
const base=process.env.AUDIT_BASE_URL||'http://127.0.0.1:8766/Kamen';
const results=[];
await mkdir('audit',{recursive:true});
const catalog=JSON.parse(await readFile('data/catalog.json','utf8'));
async function check(name,fn){try{const detail=await fn();results.push({name,pass:true,detail});console.log('PASS',name);}catch(error){results.push({name,pass:false,error:error.message});console.log('FAIL',name,error.message.slice(0,180));}}
const engines=[['chromium',chromium,{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}],...(process.env.WEBKIT_EXECUTABLE?[['webkit',webkit,{executablePath:process.env.WEBKIT_EXECUTABLE}]]:[])];
for(const [engine,type,options] of engines){
 const browser=await type.launch(options);
 for(const [width,height] of [[320,740],[390,844],[768,1024],[844,390],[1440,900]])await check(`${engine}: layout and reversible hero ${width}×${height}`,async()=>{
  const context=await browser.newContext({viewport:{width,height},hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/',{waitUntil:'networkidle'});await page.waitForFunction(()=>document.documentElement.classList.contains('ready'));
   assert(await page.locator('#header').isHidden());assert(await page.locator('.site-nav').getAttribute('inert')!==null);
   const travel=await page.evaluate(()=>parseFloat(document.documentElement.style.getPropertyValue('--intro-travel')));
   await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),travel*.3);await page.waitForTimeout(400);assert(Math.abs((await page.locator('#hero').boundingBox()).y)<1);
   await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),travel*.8);await page.waitForTimeout(650);assert(await page.locator('#copy').isVisible());
   if(width===390){for(const finish of ['light','graphite','sand']){await page.locator(`[data-finish=${finish}]`).click();await page.waitForFunction(key=>document.querySelector(`[data-finish=${key}]`).getAttribute('aria-pressed')==='true',finish);}}
   if(width<=700||width/height<=.8){
    const y=await page.evaluate(()=>scrollY);const box=await page.locator('#header .mobile-menu-trigger').boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);assert.equal(await page.locator('dialog[open]').count(),1);
    for(let i=0;i<14;i++){await page.keyboard.press('Tab');assert(await page.locator('dialog[open]').evaluate(d=>d.contains(document.activeElement)));}
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&document.documentElement.style.overflow!=='hidden');assert(Math.abs(await page.evaluate(()=>scrollY)-y)<2);
   }
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(700);
   const alpha=await page.locator('#cladding-settled').evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return data.some((value,i)=>i%4===3&&value>0)});assert.equal(alpha,false);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);return {errors};
  }finally{await context.close();}
 });
 await check(`${engine}: catalog, detail, calculation and mail workflow`,async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('test denied')}}}));const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/catalog/',{waitUntil:'networkidle'});assert.equal(await page.locator('.real-product-card').count(),145);
   await page.getByPlaceholder('Песчаник, галька, златолит…').fill('zzz-no-results');assert.equal(await page.locator('.real-product-card').count(),0);
   await page.getByPlaceholder('Песчаник, галька, златолит…').fill('Марс');assert.equal(await page.locator('.real-product-card').count(),catalog.products.filter(p=>`${p.name} ${p.terms}`.toLowerCase().includes('марс')).length);
   await page.locator('.real-product-image').first().click();await page.locator('.detail-title').waitFor();await page.getByRole('link',{name:/Рассчитать материал/}).click();await page.waitForFunction(()=>document.documentElement.classList.contains('ready'));
   await page.locator('#calc-material').selectOption('343644535260');await page.locator('#calc-area').fill('40');assert.equal((await page.locator('#calc-total').innerText()).replace(/\D/g,''),'22000');
   const edition=catalog.products.find(p=>p.id==='343644535260').variants.find(v=>v.price===600);await page.getByLabel('Вариант материала',{exact:true}).selectOption(edition.id);await page.locator('#calc-area').fill('60');assert.equal((await page.locator('#calc-total').innerText()).replace(/\D/g,''),'39600');
   await page.getByRole('button',{name:/Скопировать расчёт/}).click();assert((await page.locator('.calc-copy-fallback').inputValue()).includes('60'));
   await page.locator('#calc-area').fill('80.25');assert(await page.locator('.calc-copy-fallback').isHidden());await page.getByRole('button',{name:/Скопировать расчёт/}).click();assert((await page.locator('.calc-copy-fallback').inputValue()).includes('80'));
   await page.getByRole('button',{name:/Обсудить этот расчёт/}).click();await page.locator('input[name=name]').fill('Иван');await page.locator('input[name=phone]').fill('abcdefg');await page.locator('input[name=consent]').check();await page.getByRole('button',{name:/Подготовить заявку/}).click();assert(await page.locator('.request-status[role=alert]').isVisible());assert.equal(await page.getByRole('link',{name:/Открыть письмо/}).count(),0);
   await page.locator('input[name=phone]').fill('+79001112233');assert(await page.locator('.estimate-form').evaluate(form=>form.checkValidity()));await page.getByRole('button',{name:/Подготовить заявку/}).click();assert((await page.getByRole('link',{name:/Открыть письмо/}).getAttribute('href')).includes('mailto:'));
   await page.locator('input[name=phone]').fill('+79009998877');assert.equal(await page.getByRole('link',{name:/Открыть письмо/}).count(),0);await page.getByRole('button',{name:/Подготовить заявку/}).click();assert(decodeURIComponent(await page.getByRole('link',{name:/Открыть письмо/}).getAttribute('href')).includes('+79009998877'));
   assert.deepEqual(errors,[]);return{errors};
  }finally{await context.close();}
 });
 await check(`${engine}: renderer failure keeps catalog, menu and calculator usable`,async()=>{
  for(const failure of ['manifest','texture','canvas']){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
   if(failure==='canvas')await context.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
   if(failure==='manifest')await context.route('**/hero-manifest.json',route=>route.fulfill({status:503,body:'unavailable'}));
   if(failure==='texture')await context.route('**/hero-mobile-atlas.webp',route=>route.fulfill({status:503,body:'unavailable'}));
   const page=await context.newPage();try{await page.goto(base+'/');await page.waitForFunction(()=>document.documentElement.classList.contains('load-error'));assert(await page.locator('#header').isVisible());await page.locator('#request').click();await page.waitForFunction(()=>Math.abs(document.getElementById('calculator').getBoundingClientRect().top)<180);assert(await page.locator('#calc-material').isVisible());}finally{await context.close();}
  }return {failures:['manifest','texture','canvas']};
 });
 await check(`${engine}: reduced motion, not-found and static anchor`,async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();try{await page.goto(base+'/#calculator',{waitUntil:'networkidle'});await page.waitForFunction(()=>document.documentElement.classList.contains('ready'));assert.equal(await page.locator('.cue svg').evaluate(e=>getComputedStyle(e).animationName),'none');const response=await page.goto(base+'/does-not-exist/');assert.equal(response.status(),404);assert(await page.locator('#content').count()===1);return{};}finally{await context.close();}
 });
 await check(`${engine}: hero stays pinned until all copy is revealed, including a fast swipe`,async()=>{
  const context=await browser.newContext({viewport:{width:390,height:744},hasTouch:true});
  // A mobile visual viewport can be shorter than the stable layout viewport.
  await context.addInitScript(()=>Object.defineProperty(window,'visualViewport',{value:{height:680},configurable:true}));
  const page=await context.newPage();
  try{
   await page.goto(base+'/');await page.waitForFunction(()=>document.documentElement.classList.contains('ready'));
   const height=await page.locator('#hero').evaluate(e=>e.clientHeight);assert.equal(height,744);
   const travel=await page.evaluate(()=>parseFloat(document.documentElement.style.getPropertyValue('--intro-travel')));
   for(const fraction of [.15,.35,.5,.7,.9]){
    await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),travel*fraction);await page.waitForTimeout(40);
    assert(Math.abs(await page.locator('#hero').evaluate(e=>e.getBoundingClientRect().top))<1);assert.equal(await page.locator('#hero').evaluate(e=>getComputedStyle(e).position),'fixed');assert.equal(await page.locator('#hero').evaluate(e=>e.clientHeight),height);
   }
   // Model browser chrome expanding at the top, with the bottom edge unchanged.
   const layerRects=()=>page.evaluate(()=>['#hero','.poster img','#cladding','#cladding-settled'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {selector,top:r.top,width:r.width,height:r.height};}));
   const before=await layerRects();await page.setViewportSize({width:390,height:680});await page.waitForTimeout(70);
   const shorter=await layerRects();
   for(let i=0;i<before.length;i++){assert(Math.abs(shorter[i].top-before[i].top+64)<1);assert.equal(shorter[i].height,before[i].height);assert.equal(shorter[i].width,before[i].width);}
   assert.equal(await page.locator('#hero').evaluate(e=>e.getBoundingClientRect().bottom),680);
   await page.setViewportSize({width:390,height:744});await page.waitForTimeout(70);assert.deepEqual(await layerRects(),before);
   // Read in the first rendering opportunity after a fling crosses the pin boundary.
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(100);
   const released=await page.evaluate(async y=>{scrollTo({top:y,behavior:'instant'});await new Promise(requestAnimationFrame);return {top:document.getElementById('hero').getBoundingClientRect().top,reveal:document.getElementById('hero').style.getPropertyValue('--reveal')};},travel+100);
   assert(released.top<0);assert.equal(released.reveal,'1.000');assert.equal(await page.locator('#hero').evaluate(e=>getComputedStyle(e).position),'sticky');
   await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),travel*.4);await page.waitForTimeout(50);
   assert.equal(await page.locator('#hero').evaluate(e=>e.getBoundingClientRect().top),0);assert.equal(await page.locator('#hero').evaluate(e=>e.style.getPropertyValue('--reveal')),'0.000');
   return {height,travel,firstReleasedFrame:released};
  }finally{await context.close();}
 });
 if(engine==='chromium')await check('chromium: repeated client navigation releases hero listeners',async()=>{
  const context=await browser.newContext();const page=await context.newPage();const cdp=await context.newCDPSession(page);
  const listeners=async()=>{const r=await cdp.send('Runtime.evaluate',{expression:'(getEventListeners(window).scroll||[]).length',includeCommandLineAPI:true,returnByValue:true});return r.result.value;};
  try{await page.goto(base+'/#calculator',{waitUntil:'networkidle'});await page.waitForFunction(()=>document.documentElement.classList.contains('ready'));const before=await listeners();const counts=[];
   for(let i=0;i<5;i++){await page.locator('.site-nav nav a').first().click();await page.locator('.real-product-card').first().waitFor();counts.push(await listeners());await page.locator('.document-nav .site-brand').click();await page.waitForFunction(()=>document.documentElement.classList.contains('ready'));await page.evaluate(()=>document.getElementById('calculator').scrollIntoView({behavior:'instant'}));await page.waitForTimeout(150);assert.equal(await listeners(),before);}
   return{initialScrollListeners:before,awayCounts:counts,returnedScrollListeners:await listeners()};
  }finally{await context.close();}
 });
 await browser.close();
}
await writeFile('audit/browser-results.json',JSON.stringify({base,results},null,2));if(results.some(r=>!r.pass))process.exitCode=1;
