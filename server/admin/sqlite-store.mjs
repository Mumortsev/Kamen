import initialCatalog from '../../data/catalog.json' with {type:'json'};
import {DatabaseSync,backup} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {AdminError,normalizeCategory,normalizeProduct,publicCatalog,withAutomaticPath,normalizeSiteImages} from './validation.mjs';
export function createStore({directory,seed=initialCatalog}){
 mkdirSync(directory,{recursive:true});mkdirSync(join(directory,'uploads'),{recursive:true});
 const db=new DatabaseSync(join(directory,'catalog.sqlite'));db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 db.exec(`CREATE TABLE IF NOT EXISTS catalog_state (id INTEGER PRIMARY KEY CHECK(id=1), draft TEXT NOT NULL, revision INTEGER NOT NULL, published TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS admin_users (username TEXT PRIMARY KEY,password TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY,username TEXT NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY,at TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY,at TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new');
 CREATE TABLE IF NOT EXISTS deploys (revision INTEGER PRIMARY KEY,status TEXT NOT NULL,run_id TEXT,updated TEXT NOT NULL);`);
 if(!db.prepare('SELECT id FROM catalog_state WHERE id=1').get()){
  const categories=seed.categories.map((c,i)=>normalizeCategory({...c,order:i}));
  const products=seed.products.map((p,i)=>({...normalizeProduct({...p,status:'published',order:i},categories),_version:1}));
  const draft={source:seed.source,categories,products,...(seed.siteImages?{siteImages:normalizeSiteImages(seed.siteImages)}:{})};const published=publicCatalog(draft,1,seed.checkedAt||new Date().toISOString());
  db.prepare('INSERT INTO catalog_state VALUES(1,?,?,?)').run(JSON.stringify(draft),1,JSON.stringify(published));
 }
 const state=()=>{const row=db.prepare('SELECT * FROM catalog_state WHERE id=1').get();return{draft:JSON.parse(row.draft),revision:Number(row.revision),published:JSON.parse(row.published)};};
 const log=(actor,action,target)=>db.prepare('INSERT INTO audit_log(at,actor,action,target) VALUES(?,?,?,?)').run(new Date().toISOString(),actor,action,target);
 // Serialize read/modify/write and compare revisions in one transaction. Two editors cannot overwrite one another silently.
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 const update=draft=>{const next=state().revision+1;db.prepare('UPDATE catalog_state SET draft=?,revision=?,published=? WHERE id=1').run(JSON.stringify(draft),next,JSON.stringify(publicCatalog(draft,next,new Date().toISOString())));};
 const checkRevision=(expected,actual)=>{if(expected!==actual)throw new AdminError('Данные изменились в другой вкладке. Обновите список и повторите действие.',409);};
 return{db,directory,state,close:()=>db.close(),backup:destination=>backup(db,destination),
  published:()=>state().published,
  admin:()=>{const s=state();return{...s.draft,revision:s.revision,publishedRevision:s.published.revision,publishedAt:s.published.checkedAt,audit:db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 50').all(),deploy:db.prepare('SELECT * FROM deploys ORDER BY revision DESC LIMIT 1').get()||null};},
  saveSiteImages(input,expected,actor){return transaction(()=>{const s=state();checkRevision(expected,s.revision);s.draft.siteImages=normalizeSiteImages(input);update(s.draft);log(actor,'site.photos.save','');return s.draft.siteImages;});},
  saveProduct(input,actor){return transaction(()=>{const s=state();const product=normalizeProduct(withAutomaticPath(input,s.draft,'product'),s.draft.categories);const old=s.draft.products.find(p=>p.id===product.id);checkRevision(input._version??0,old?._version??0);if(old&&old.path!==product.path)throw new AdminError('Адрес сохранённого товара менять нельзя. Измените название, сохранив прежний URL.');if([...s.draft.products.filter(p=>p.id!==product.id),...s.draft.categories].some(p=>p.path===product.path))throw new AdminError('Этот адрес уже занят.');const saved={...product,_version:(old?._version??0)+1};s.draft.products=s.draft.products.filter(p=>p.id!==product.id);s.draft.products.push(saved);update(s.draft);log(actor,old?'product.update':'product.create',product.id);return saved;});},
  deleteProduct(id,expected,actor){return transaction(()=>{const s=state();const old=s.draft.products.find(p=>p.id===id);if(!old)throw new AdminError('Товар не найден.',404);checkRevision(expected,old._version);s.draft.products=s.draft.products.filter(p=>p.id!==id);update(s.draft);log(actor,'product.delete',id);});},
  deleteCategory(id,expected,actor){return transaction(()=>{const s=state();checkRevision(expected,s.revision);if(!s.draft.categories.some(c=>c.id===id))throw new AdminError('Категория не найдена.',404);if(s.draft.products.some(p=>p.categories.includes(id)))throw new AdminError('Сначала перенесите товары этой категории в другую категорию.',409);s.draft.categories=s.draft.categories.filter(c=>c.id!==id);update(s.draft);log(actor,'category.delete',id);});},
  saveCategory(input,expected,actor){return transaction(()=>{const s=state();checkRevision(expected,s.revision);const category=normalizeCategory(withAutomaticPath(input,s.draft,'category'));const old=s.draft.categories.find(c=>c.id===category.id);if(old&&old.path!==category.path)throw new AdminError('Адрес существующей категории сохраняется.');if([...s.draft.products,...s.draft.categories.filter(c=>c.id!==category.id)].some(p=>p.path===category.path))throw new AdminError('Этот адрес уже занят.');s.draft.categories=s.draft.categories.filter(c=>c.id!==category.id);s.draft.categories.push(category);update(s.draft);log(actor,'category.save',category.id);return category;});},
  publish(expected,actor){return transaction(()=>{const s=state();checkRevision(expected,s.revision);const snapshot=publicCatalog(s.draft,s.revision,new Date().toISOString());db.prepare('UPDATE catalog_state SET published=? WHERE id=1').run(JSON.stringify(snapshot));log(actor,'catalog.publish',String(s.revision));return snapshot;});},
  setDeploy(revision,status,runId=null){db.prepare('INSERT OR REPLACE INTO deploys VALUES(?,?,?,?)').run(revision,status,runId,new Date().toISOString());},
  restore(input,expected,actor){return transaction(()=>{const s=state();checkRevision(expected,s.revision);if(!input||!Array.isArray(input.products)||input.products.length>10000||!Array.isArray(input.categories)||!input.categories.length||input.categories.length>200)throw new AdminError('Неверный файл каталога.');const categories=input.categories.map(normalizeCategory);const products=input.products.map(p=>({...normalizeProduct(p,categories),_version:(s.draft.products.find(old=>old.id===p.id)?._version||0)+1}));for(const list of[categories,products])if(new Set(list.map(p=>p.id)).size!==list.length)throw new AdminError('Повторяющиеся ID.');const draft={source:s.draft.source,categories,products,...(input.siteImages?{siteImages:normalizeSiteImages(input.siteImages)}:s.draft.siteImages?{siteImages:s.draft.siteImages}:{})};publicCatalog(draft,s.revision+1,new Date().toISOString());update(draft);log(actor,'catalog.restore','draft');});},
  async addLead(payload){const id=randomUUID();db.prepare('INSERT INTO leads(id,at,payload,status) VALUES(?,?,?,?)').run(id,new Date().toISOString(),JSON.stringify(payload),'new');return id;},
  setLeadEmail(id,delivery){const row=db.prepare('SELECT payload FROM leads WHERE id=?').get(id);if(row){const payload={...JSON.parse(row.payload),emailDelivery:delivery};db.prepare('UPDATE leads SET payload=? WHERE id=?').run(JSON.stringify(payload),id);}},
  deleteLead(id){db.prepare('DELETE FROM leads WHERE id=?').run(id);},
  leads:()=>db.prepare('SELECT * FROM leads ORDER BY at DESC LIMIT 300').all().map(row=>({...row,payload:JSON.parse(row.payload)})),
  setLeadStatus(id,status){if(!['new','done'].includes(status))throw new AdminError('Неверный статус заявки.');db.prepare('UPDATE leads SET status=? WHERE id=?').run(status,id);},
  audit:log,
  setUser(username,password){transaction(()=>{db.prepare('INSERT OR REPLACE INTO admin_users VALUES(?,?)').run(username,password);db.prepare('DELETE FROM sessions WHERE username=?').run(username);log('cli','user.reset',username);});},
  user:username=>db.prepare('SELECT * FROM admin_users WHERE username=?').get(username),
  session(token){if(!token)return null;const hash=createHash('sha256').update(token).digest('hex');const s=db.prepare('SELECT * FROM sessions WHERE hash=? AND expires>?').get(hash,Date.now());return s||null;},
  createSession(username){db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());const token=randomUUID()+randomUUID();const csrf=randomUUID();const expires=Date.now()+8*3600000;db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),username,csrf,expires);return{token,csrf,expires};},
  logout(token){db.prepare('DELETE FROM sessions WHERE hash=?').run(createHash('sha256').update(token||'').digest('hex'));},
  loginAllowed(key){db.prepare('DELETE FROM login_limits WHERE expires<?').run(Date.now());return Number(db.prepare('SELECT attempts FROM login_limits WHERE key=?').get(key)?.attempts||0)<8;},
  loginFailure(key){db.prepare('INSERT INTO login_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').run(key,Date.now()+15*60000);},
 };
}
