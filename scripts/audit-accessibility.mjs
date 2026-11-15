import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const results=[];
for(const [path,viewport] of [['/',{width:390,height:844}],['/catalog/',{width:1440,height:900}],['/#calculator',{width:390,height:844}],['/contact/',{width:390,height:844}],['/peschanik-sero-zelenyj/tproduct/127239493-343644535260-peschanik-sero-zelenii-rf/',{width:390,height:844}],['/catalog/?audit-menu=1',{width:390,height:844}]]){
 const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/Kamen'+path,{waitUntil:'networkidle'});if(path.startsWith('/#'))await page.waitForTimeout(700);
 if(path.includes('audit-menu'))await page.locator('.document-nav .mobile-menu-trigger').click();
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','best-practice']).analyze();
 results.push({path,viewport,errors,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,15),count:v.nodes.length}))});
 console.log(path,results.at(-1).violations.map(v=>[v.id,v.count]));await context.close();
}
const page=await browser.newPage();await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('denied')}}})});await page.goto('http://127.0.0.1:8766/Kamen/#calculator',{waitUntil:'networkidle'});await page.getByRole('button',{name:/Скопировать расчёт/}).click();const first=await page.locator('.calc-copy-fallback').inputValue();await page.locator('#calc-area').fill('60');results.push({repro:'stale-copy',stale:await page.locator('.calc-copy-fallback').isVisible()&&await page.locator('.calc-copy-fallback').inputValue()===first});
await page.getByRole('button',{name:/Обсудить этот расчёт/}).click();await page.locator('input[name=name]').fill('Иван');await page.locator('input[name=phone]').fill('+79001112233');await page.locator('input[name=consent]').check();await page.getByRole('button',{name:/Подготовить заявку/}).click();const href=await page.getByRole('link',{name:/Открыть письмо/}).getAttribute('href');await page.locator('input[name=phone]').fill('+79009998877');results.push({repro:'stale-mail',stale:await page.getByRole('link',{name:/Открыть письмо/}).isVisible()&&await page.getByRole('link',{name:/Открыть письмо/}).getAttribute('href')===href});
await writeFile(process.env.AUDIT_OUTPUT||'audit/accessibility-after.json',JSON.stringify(results,null,2));await browser.close();
