import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
const base='https://kamen-green.vercel.app';
const phase=process.argv[2];
if(!['create','verify-cleanup'].includes(phase))throw Error('Choose create or verify-cleanup for the explicitly authorized demo.');
const password=(await readFile('/workspace/Kamen-demo-access.txt','utf8')).split('Пароль: ')[1]?.split('\n')[0];
if(!password)throw Error('Private demo credentials are not available.');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const errors=[];
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,proxy:{server:'http://proxy:8080'}});
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',dialog=>dialog.accept());
 await p.goto(base+'/admin/',{waitUntil:'networkidle'});await p.getByLabel('Логин',{exact:true}).fill('demo');await p.getByLabel('Пароль',{exact:true}).fill(password);await p.getByRole('button',{name:'Войти в панель'}).click();await p.locator('.admin-product-row').first().waitFor();
 const getData=async()=>{const r=await ctx.request.get(base+'/api/admin/catalog/');assert(r.ok());return r.json();};
 const nav=async label=>{await p.locator('.admin-menu-toggle').click();await p.locator('.admin-sidebar nav button').filter({hasText:label}).click();};
 const publish=async()=>{if(await p.getByRole('button',{name:'Все материалы',exact:false}).count())await p.getByRole('button',{name:'Все материалы',exact:false}).click();await p.locator('.admin-topbar button').filter({hasText:'Опубликовать'}).click();await p.getByRole('button',{name:'Да, опубликовать',exact:true}).click();await p.getByRole('status').filter({hasText:'Сайт обновлён'}).waitFor();};
 const openProduct=async name=>{await nav('Материалы');await p.getByRole('textbox',{name:'Поиск материалов'}).fill(name);await p.locator('.admin-product-row').first().click();};
 if(phase==='create'){
  const nonce=Date.now().toString(36);const categoryName='Проверка демо '+nonce;const productName='Тест сохранения '+nonce;const productPath='/product/demo-check-'+nonce;const categoryPath='/category/demo-check-'+nonce;
  const before=await getData();assert(!before.products.some(v=>v.path===productPath));
  await nav('Категории');await p.getByRole('button',{name:'Добавить',exact:false}).click();await p.getByLabel('Название',{exact:true}).fill(categoryName);await p.getByLabel('Адрес',{exact:true}).fill(categoryPath);await p.getByRole('button',{name:'Сохранить',exact:true}).click();await p.getByRole('status').filter({hasText:'Категория сохранена'}).waitFor();
  await nav('Материалы');await p.getByRole('button',{name:'Добавить материал',exact:false}).click();await p.getByLabel('Название',{exact:true}).fill(productName);await p.getByLabel('Адрес страницы',{exact:false}).fill(productPath);await p.getByLabel('Описание',{exact:true}).fill('Проверка редактирования описания на бесплатном демонстрационном стенде.');await p.getByLabel('Базовая цена, ₽',{exact:false}).fill('321');
  const checks=p.locator('.admin-category-options input');for(let i=0;i<await checks.count();i++)if(await checks.nth(i).isChecked())await checks.nth(i).uncheck();await p.getByLabel(categoryName,{exact:true}).check();
  const image=await sharp({create:{width:600,height:450,channels:3,background:'#b8aa8d'}}).png().toBuffer();await p.locator('.admin-upload input').setInputFiles({name:'demo-stone.png',mimeType:'image/png',buffer:image});await p.locator('.admin-photo img').waitFor();
  const photoSrc=await p.locator('.admin-photo img').first().getAttribute('src');assert(new URL(photoSrc).hostname.endsWith('.public.blob.vercel-storage.com'));
  await p.getByRole('button',{name:'Добавить исполнение',exact:false}).click();await p.getByLabel('Исполнение',{exact:true}).fill('Проверочная толщина');await p.getByLabel('Цена, ₽',{exact:true}).fill('456');await p.getByLabel('Статус',{exact:false}).selectOption('published');await p.getByRole('button',{name:'Сохранить',exact:true}).click();await p.getByRole('status').filter({hasText:'Товар сохранён'}).waitFor();
  const draft=await getData();const product=draft.products.find(v=>v.path===productPath);const group=draft.categories.find(v=>v.path===categoryPath);assert(product&&group);
  let published=await(await ctx.request.get(base+'/api/catalog/')).json();assert(!published.products.some(v=>v.id===product.id));await publish();
  const visitor=await ctx.newPage();visitor.on('pageerror',e=>errors.push(e.message));const response=await visitor.goto(base+productPath+'/');assert.equal(response.status(),200);assert((await visitor.locator('.detail-price').innerText()).includes('321'));assert(await visitor.getByText('Проверка редактирования описания на бесплатном демонстрационном стенде.',{exact:true}).isVisible());
  await visitor.goto(base+'/?material='+product.id+'#calculator');await visitor.waitForFunction(()=>document.documentElement.classList.contains('ready'));await visitor.getByLabel('Вариант материала',{exact:true}).selectOption(product.variants[0].id);await visitor.waitForFunction(()=>document.getElementById('calc-total').textContent.replace(/\D/g,'')==='20064');
  await openProduct(productName);await p.getByLabel('Базовая цена, ₽',{exact:false}).fill('654');await p.getByLabel('Цена, ₽',{exact:true}).fill('789');await p.getByRole('button',{name:'Сохранить',exact:true}).click();await p.getByRole('status').filter({hasText:'Товар сохранён'}).waitFor();await publish();await visitor.bringToFront();await visitor.evaluate(()=>window.dispatchEvent(new Event('stone:catalog-refresh')));await visitor.waitForFunction(()=>document.getElementById('calc-total').textContent.replace(/\D/g,'')==='34716');
  await mkdir('/workspace/Kamen-review/vercel',{recursive:true});await p.screenshot({path:'/workspace/Kamen-review/vercel/admin-live.png'});await writeFile('/tmp/kamen-live-demo-check.json',JSON.stringify({productId:product.id,categoryId:group.id,productName,categoryName,productPath,categoryPath,photoSrc,originalProductCount:before.products.length,originalCategoryCount:before.categories.length}));console.log('PASS live login, category/product creation, Blob photo, description, publication and calculator price sync. Ready for redeploy persistence check.');
 }else{
  const check=JSON.parse(await readFile('/tmp/kamen-live-demo-check.json'));assert(check.productPath.startsWith('/product/demo-check-'));assert(check.categoryPath.startsWith('/category/demo-check-'));
  const data=await getData();const product=data.products.find(v=>v.id===check.productId);assert.equal(product.price,654);assert.equal(product.variants[0].price,789);assert.equal(product.images[0].src,check.photoSrc);
  assert.equal((await ctx.request.get(check.photoSrc)).status(),200);assert.equal((await ctx.request.get(base+check.productPath+'/')).status(),200);
  await openProduct(check.productName);await p.getByRole('button',{name:'Удалить товар',exact:true}).click();await p.getByRole('status').filter({hasText:'Товар удалён из редактора'}).waitFor();await nav('Категории');await p.locator('.admin-category-card').filter({hasText:check.categoryName}).click();await p.getByRole('button',{name:'Удалить категорию',exact:true}).click();await p.getByRole('status').filter({hasText:'Категория удалена'}).waitFor();await publish();
  const final=await getData();assert.equal(final.products.length,check.originalProductCount);assert.equal(final.categories.length,check.originalCategoryCount);const snapshot=await(await ctx.request.get(base+'/api/catalog/')).json();assert(!snapshot.products.some(v=>v.id===check.productId));assert(!snapshot.categories.some(v=>v.id===check.categoryId));assert.equal((await ctx.request.get(base+check.productPath+'/')).status(),404);
  assert.deepEqual(errors,[]);await writeFile('audit/vercel-demo.json',JSON.stringify({checkedAt:new Date().toISOString(),url:base,method:'Authorized noncommercial demo, temporary isolated product/category only; original catalog preserved',checks:['public access without Vercel login','application login','category creation','product creation and description','photo upload to Vercel Blob','atomic publication','calculator edition price synchronized','price and photo persisted across redeploy','confirmed product and category deletion','original catalog restored'],products:snapshot.products.length,categories:snapshot.categories.length,revision:snapshot.revision,errors,realLeadsSent:false},null,2));console.log('PASS redeploy persistence, photo access and confirmed deletion; original catalog restored.');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
