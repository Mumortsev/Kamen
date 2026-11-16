import {readFile,writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import sharp from 'sharp';
import {put} from '@vercel/blob';
import {getStore} from './store.mjs';
import {AdminError} from './validation.mjs';
import {verifyPassword} from './auth.mjs';
import {clientAddress} from '../lead-handler.mjs';
const cookieName='kt_admin';
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export async function readBody(req,limit){if(Number(req.headers['content-length'])>limit){req.resume();throw new AdminError('Файл или запрос слишком большой.',413);}const chunks=[];let bytes=0;for await(const chunk of req.iterator({destroyOnReturn:false})){bytes+=chunk.length;if(bytes>limit){req.resume();throw new AdminError('Файл или запрос слишком большой.',413);}chunks.push(chunk);}return Buffer.concat(chunks);}
export function createAdminHandler({store=getStore,siteUrl=process.env.SITE_URL||'',trustedProxyHops=0,send=fetch}={}){
 let loginBusy=0;
 return async function admin(req,res){
  const path=new URL(req.url,'http://localhost').pathname.replace(/\/$/,'');
  if(!path.startsWith('/api/admin')&&!path.startsWith('/api/catalog')&&!path.startsWith('/uploads/'))return false;
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  const answer=(status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
  try{
   const db=await store();
   if(path.startsWith('/uploads/')){
    if(!db.directory)throw new AdminError('Фото не найдено.',404);
    if(!['GET','HEAD'].includes(req.method))throw new AdminError('Метод не поддерживается.',405);
    if(!/^\/uploads\/[a-f0-9-]+(?:_thumb)?\.webp$/.test(path))throw new AdminError('Фото не найдено.',404);
    let bytes;try{bytes=await readFile(join(db.directory,'uploads',path.slice(9)));}catch{throw new AdminError('Фото не найдено.',404);}
    res.setHeader('Content-Type','image/webp');res.setHeader('Cache-Control','public, max-age=31536000, immutable');res.end(req.method==='HEAD'?undefined:bytes);return true;
   }
   if(path==='/api/catalog'){
    if(req.method!=='GET')throw new AdminError('Метод не поддерживается.',405);const catalog=await db.published();if(new URL(req.url,'http://localhost').searchParams.get('view')==='calculator'){catalog.products=catalog.products.filter(p=>p.calculator!==false&&['m2','kg'].includes(p.unit)).map(({id,name,terms,price,unit,variants,images,minimumOrder,density,packSize})=>({id,name,terms,price,unit,variants,images:images.slice(0,1),minimumOrder,density,packSize}));catalog.categories=[];}answer(200,catalog);return true;
   }
   if(path==='/api/catalog/deploy-status'){
    if(req.method!=='POST'||!process.env.PAGES_CALLBACK_TOKEN||!equal(req.headers.authorization,`Bearer ${process.env.PAGES_CALLBACK_TOKEN}`))throw new AdminError('Нет доступа.',403);
    const data=JSON.parse((await readBody(req,4096)).toString());if(!Number.isInteger(data.revision)||!['deployed','failed','building'].includes(data.status)||data.runId&&!/^\d+$/.test(data.runId))throw new AdminError('Неверный статус.');await db.setDeploy(data.revision,data.status,data.runId||null);answer(200,{ok:true});return true;
   }
   const token=String(req.headers.cookie||'').split(';').map(c=>c.trim()).find(c=>c.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
   const session=await db.session(token);
   if(req.method==='GET'&&path==='/api/admin/session'){answer(200,session?{authenticated:true,username:session.username,csrf:session.csrf}:{authenticated:false});return true;}
   const writing=!['GET','HEAD'].includes(req.method);
   if(writing){
    let origin;try{origin=new URL(String(req.headers.origin));}catch{throw new AdminError('Недопустимый источник запроса.',403);}
    const requestHost=String(req.headers.host||'');const canonical=siteUrl?new URL(siteUrl).origin:'';
    if(!['http:','https:'].includes(origin.protocol)||origin.host!==requestHost&&origin.origin!==canonical)throw new AdminError('Недопустимый источник запроса.',403);
   }
   const json=async(limit=1024*1024)=>{if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new AdminError('Ожидается JSON.',415);try{return JSON.parse((await readBody(req,limit)).toString());}catch(e){if(e instanceof AdminError)throw e;throw new AdminError('Некорректный JSON.');}};
   const secure=siteUrl.startsWith('https:')||process.env.VERCEL==='1';
   const setCookie=(value,age)=>res.setHeader('Set-Cookie',`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`);
   if(path==='/api/admin/login'&&req.method==='POST'){
    const data=await json(4096);const username=typeof data.username==='string'?data.username.trim():'';
    const ip=clientAddress(req,trustedProxyHops);const ipKey='ip:'+ip;const userKey='user:'+username;
    if(!(await db.loginAllowed(ipKey))||!(await db.loginAllowed(userKey))||loginBusy>=4){res.setHeader('Retry-After','900');throw new AdminError('Слишком много попыток входа. Повторите через 15 минут.',429);}
    loginBusy++;let valid;try{valid=await verifyPassword(data.password,(await db.user(username))?.password);}finally{loginBusy--;}
    if(!valid){await db.loginFailure(ipKey);await db.loginFailure(userKey);throw new AdminError('Неверный логин или пароль.',401);}
    const s=await db.createSession(username);setCookie(s.token,8*3600);await db.audit(username,'session.login','');answer(200,{ok:true,username,csrf:s.csrf});return true;
   }
   if(!session)throw new AdminError('Войдите в панель управления.',401);
   if(writing&&!equal(req.headers['x-csrf-token'],session.csrf))throw new AdminError('Сессия изменилась. Обновите страницу.',403);
   if(path==='/api/admin/logout'&&req.method==='POST'){await db.logout(token);setCookie('',0);answer(200,{ok:true});return true;}
   if(path==='/api/admin/catalog'&&req.method==='GET'){answer(200,await db.admin());return true;}
   if(path==='/api/admin/products'&&req.method==='POST'){const data=await json();const saved=await db.saveProduct(data,session.username);answer(200,{ok:true,product:saved});return true;}
   if(path==='/api/admin/products/delete'&&req.method==='POST'){const data=await json();await db.deleteProduct(data.id,data.version,session.username);answer(200,{ok:true});return true;}
   if(path==='/api/admin/categories/delete'&&req.method==='POST'){const data=await json();await db.deleteCategory(data.id,data.revision,session.username);answer(200,{ok:true});return true;}
   if(path==='/api/admin/categories'&&req.method==='POST'){const data=await json();answer(200,{ok:true,category:await db.saveCategory(data.category,data.revision,session.username)});return true;}
   if(path==='/api/admin/publish'&&req.method==='POST'){
    const data=await json(4096);const snapshot=await db.publish(data.revision,session.username);await db.setDeploy(snapshot.revision,'not_configured');
    if(process.env.PAGES_GITHUB_TOKEN){try{const r=await send('https://api.github.com/repos/Mumortsev/Kamen/actions/workflows/pages.yml/dispatches',{method:'POST',headers:{Authorization:`Bearer ${process.env.PAGES_GITHUB_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:JSON.stringify({ref:'main',inputs:{catalog_revision:String(snapshot.revision)}}),signal:AbortSignal.timeout(10000)});await db.setDeploy(snapshot.revision,r.ok?'queued':'failed');}catch{await db.setDeploy(snapshot.revision,'failed');}}
    answer(200,{ok:true,revision:snapshot.revision,deploy:(await db.admin()).deploy});return true;
   }
   if(path==='/api/admin/export'&&req.method==='GET'){res.setHeader('Content-Disposition','attachment; filename="kamentorg-catalog.json"');answer(200,{...(await db.state()).draft,exportedAt:new Date().toISOString(),format:'kamentorg-catalog-v1'});return true;}
   if(path==='/api/admin/restore'&&req.method==='POST'){const data=await json(20*1024*1024);await db.restore(data.catalog,data.revision,session.username);answer(200,{ok:true});return true;}
   if(path==='/api/admin/media'&&req.method==='POST'){
    if(!['image/jpeg','image/png','image/webp','image/avif'].includes(String(req.headers['content-type']).split(';')[0]))throw new AdminError('Загрузите JPEG, PNG, WebP или AVIF.',415);
    if(process.env.VERCEL&&!process.env.BLOB_READ_WRITE_TOKEN)throw new AdminError('Подключите Vercel Blob для загрузки фотографий.',503);
    const data=await readBody(req,process.env.VERCEL?3500000:10*1024*1024);let image;
    try{image=sharp(data,{limitInputPixels:25000000,animated:false});const meta=await image.metadata();if(!['jpeg','png','webp','avif','heif'].includes(meta.format)||!meta.width||!meta.height)throw Error('format');}catch{throw new AdminError('Не удалось открыть изображение. Максимум — 25 мегапикселей.');}
    const id=randomUUID();const file=id+'.webp';const thumb=id+'_thumb.webp';
    const [main,small]=await Promise.all([image.clone().rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer(),image.clone().rotate().resize(400,400,{fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer()]);
    let src='/uploads/'+file,thumbnail='/uploads/'+thumb;
    if(process.env.BLOB_READ_WRITE_TOKEN){const[large,smallBlob]=await Promise.all([put('kamentorg/'+file,main,{access:'public',addRandomSuffix:false,contentType:'image/webp'}),put('kamentorg/'+thumb,small,{access:'public',addRandomSuffix:false,contentType:'image/webp'})]);src=large.url;thumbnail=smallBlob.url;}else{await Promise.all([writeFile(join(db.directory,'uploads',file),main,{flag:'wx'}),writeFile(join(db.directory,'uploads',thumb),small,{flag:'wx'})]);}
    await db.audit(session.username,'media.upload',file);answer(200,{ok:true,src,thumbnail});return true;
   }
   throw new AdminError('Адрес не найден.',404);
  }catch(e){if(!res.headersSent)answer(e instanceof AdminError?e.status:500,{error:e instanceof AdminError?e.message:'Не удалось выполнить действие. Попробуйте ещё раз.'});else if(!res.writableEnded)res.end();}
  return true;
 };
}
