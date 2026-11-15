import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base=process.env.AUDIT_BASE_URL||'http://127.0.0.1:8766/Kamen';
const engines=[['chromium',chromium,{executablePath:'/usr/bin/chromium',args:['--no-sandbox']}],...(process.env.WEBKIT_EXECUTABLE?[['webkit',webkit,{executablePath:process.env.WEBKIT_EXECUTABLE}]]:[])];
const results=[];
for(const [engine,type,options] of engines){
 const browser=await type.launch(options);
 try{
  const context=await browser.newContext({viewport:{width:390,height:744},hasTouch:true,...(engine==='chromium'?{isMobile:true}:{}),...(process.env.AUDIT_PROXY?{proxy:{server:process.env.AUDIT_PROXY}}:{})});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/?viewport-audit='+Date.now());await page.waitForFunction(()=>document.documentElement.classList.contains('ready'));
  const travel=await page.evaluate(()=>parseFloat(document.documentElement.style.getPropertyValue('--intro-travel')));
  await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),travel*.4);await page.waitForTimeout(70);
  const rects=()=>page.evaluate(()=>['#hero','.poster img','#cladding','#cladding-settled'].map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect();return{selector,x:r.x,y:r.y,width:r.width,height:r.height};}));
  const full=await rects();await page.setViewportSize({width:390,height:680});await page.waitForTimeout(80);const short=await rects();
  for(let i=0;i<full.length;i++){
   // A toolbar adds 64px above the webpage. Absolute screen Y stays unchanged.
   assert(Math.abs(short[i].y+64-full[i].y)<1);assert.equal(short[i].width,full[i].width);assert.equal(short[i].height,full[i].height);
  }
  assert.equal(await page.locator('#hero').evaluate(e=>getComputedStyle(e).position),'fixed');
  await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),travel+100);await page.waitForTimeout(60);
  const release=await page.locator('#hero').evaluate(e=>({y:e.getBoundingClientRect().y,reveal:e.style.getPropertyValue('--reveal'),position:getComputedStyle(e).position}));
  assert(Math.abs(release.y+164)<1);assert.equal(release.reveal,'1.000');assert.equal(release.position,'sticky');
  await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),travel*.4);await page.waitForTimeout(60);assert.deepEqual(await rects(),short);
  await page.setViewportSize({width:390,height:744});await page.waitForTimeout(80);assert.deepEqual(await rects(),full);assert.deepEqual(errors,[]);
  await context.close();
  const nojs=await browser.newContext({viewport:{width:390,height:744},javaScriptEnabled:false,...(process.env.AUDIT_PROXY?{proxy:{server:process.env.AUDIT_PROXY}}:{})});
  const initial=await nojs.newPage();await initial.goto(base+'/');const bottom=await initial.locator('#hero').evaluate(e=>e.getBoundingClientRect().bottom);assert.equal(bottom,744);await nojs.close();
  results.push({engine,pass:true,method:'Viewport height 744 → 680 → 744 models a 64px toolbar at the top; no physical browser UI',full,short,release,initialBottom:bottom,errors});console.log('PASS '+engine+': bottom anchor, all photographic layers, release, reverse and initial CSS');
 }finally{await browser.close();}
}
await writeFile(process.env.AUDIT_OUTPUT||'audit/hero-viewport.json',JSON.stringify({base,checkedAt:new Date().toISOString(),results},null,2));
