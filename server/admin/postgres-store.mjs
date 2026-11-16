import initialCatalog from '../../data/catalog.json' with {type:'json'};
import pg from 'pg';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {attachDatabasePool} from '@vercel/functions';
import {AdminError,normalizeCategory,normalizeProduct,publicCatalog} from './validation.mjs';
const {Pool}=pg;
export function createPostgresStore(connectionString,{pool:providedPool}={}){
 const pool=providedPool||new Pool({connectionString,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});
 if(process.env.VERCEL&&!providedPool)attachDatabasePool(pool);
 const hash=token=>createHash('sha256').update(token||'').digest('hex');
 const query=async(sql,values=[],client=pool)=>(await client.query(sql,values)).rows;
 const state=async(client=pool)=>{const [row]=await query('SELECT * FROM kt_catalog_state WHERE id=1',[],client);if(!row)throw new AdminError('Импортируйте каталог командой npm run admin:init.',503);return{draft:row.draft,revision:Number(row.revision),published:row.published};};
 const log=async(actor,action,target,client=pool)=>{await query('INSERT INTO kt_audit_log(at,actor,action,target) VALUES($1,$2,$3,$4)',[new Date().toISOString(),actor,action,target],client);};
 // All draft mutations take the same row lock. Product versions still detect stale
 // editor forms, and publication commits one complete catalog revision atomically.
 const tx=async fn=>{const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT id FROM kt_catalog_state WHERE id=1 FOR UPDATE');const value=await fn(client);await client.query('COMMIT');return value;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}};
 const check=(expected,actual)=>{if(expected!==actual)throw new AdminError('Данные изменились в другой вкладке. Обновите список и повторите действие.',409);};
 const update=async(draft,client)=>{await query('UPDATE kt_catalog_state SET draft=$1,revision=revision+1 WHERE id=1',[JSON.stringify(draft)],client);};
 return{pool,state,close:()=>pool.end(),
  async initialize(seed=initialCatalog){
   await pool.query(`CREATE TABLE IF NOT EXISTS kt_catalog_state(id INTEGER PRIMARY KEY CHECK(id=1),draft JSONB NOT NULL,revision INTEGER NOT NULL,published JSONB NOT NULL);
   CREATE TABLE IF NOT EXISTS kt_admin_users(username TEXT PRIMARY KEY,password TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS kt_sessions(hash TEXT PRIMARY KEY,username TEXT NOT NULL,csrf TEXT NOT NULL,expires BIGINT NOT NULL);
   CREATE TABLE IF NOT EXISTS kt_login_limits(key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires BIGINT NOT NULL);
   CREATE TABLE IF NOT EXISTS kt_audit_log(id BIGSERIAL PRIMARY KEY,at TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS kt_deploys(revision INTEGER PRIMARY KEY,status TEXT NOT NULL,run_id TEXT,updated TEXT NOT NULL);`);
   const categories=seed.categories.map((c,i)=>normalizeCategory({...c,order:c.order??i}));
   const products=seed.products.map((p,i)=>({...normalizeProduct({...p,status:'published',order:p.order??i},categories),_version:1}));
   const draft={source:seed.source,categories,products};await query('INSERT INTO kt_catalog_state VALUES(1,$1,1,$2) ON CONFLICT(id) DO NOTHING',[JSON.stringify(draft),JSON.stringify(publicCatalog(draft,1,seed.checkedAt||new Date().toISOString()))]);
  },
  published:async()=> (await state()).published,
  async admin(){const s=await state();const[audit,deploy]=await Promise.all([query('SELECT * FROM kt_audit_log ORDER BY id DESC LIMIT 50'),query('SELECT * FROM kt_deploys ORDER BY revision DESC LIMIT 1')]);return{...s.draft,revision:s.revision,publishedRevision:s.published.revision,publishedAt:s.published.checkedAt,audit,deploy:deploy[0]||null};},
  async saveProduct(input,actor){return tx(async client=>{const s=await state(client);const product=normalizeProduct(input,s.draft.categories);const old=s.draft.products.find(p=>p.id===product.id);check(input._version??0,old?._version??0);if(old&&old.path!==product.path)throw new AdminError('Адрес сохранённого товара менять нельзя.');if([...s.draft.products.filter(p=>p.id!==product.id),...s.draft.categories].some(p=>p.path===product.path))throw new AdminError('Этот адрес уже занят.');const saved={...product,_version:(old?._version??0)+1};s.draft.products=s.draft.products.filter(p=>p.id!==product.id);s.draft.products.push(saved);await update(s.draft,client);await log(actor,old?'product.update':'product.create',product.id,client);return saved;});},
  async saveCategory(input,expected,actor){return tx(async client=>{const s=await state(client);check(expected,s.revision);const category=normalizeCategory(input);const old=s.draft.categories.find(c=>c.id===category.id);if(old&&old.path!==category.path)throw new AdminError('Адрес существующей категории сохраняется.');if([...s.draft.products,...s.draft.categories.filter(c=>c.id!==category.id)].some(p=>p.path===category.path))throw new AdminError('Этот адрес уже занят.');s.draft.categories=s.draft.categories.filter(c=>c.id!==category.id);s.draft.categories.push(category);await update(s.draft,client);await log(actor,'category.save',category.id,client);return category;});},
  async publish(expected,actor){return tx(async client=>{const s=await state(client);check(expected,s.revision);const published=publicCatalog(s.draft,s.revision,new Date().toISOString());await query('UPDATE kt_catalog_state SET published=$1 WHERE id=1',[JSON.stringify(published)],client);await log(actor,'catalog.publish',String(s.revision),client);return published;});},
  async restore(input,expected,actor){return tx(async client=>{const s=await state(client);check(expected,s.revision);if(!input||!Array.isArray(input.products)||input.products.length>10000||!Array.isArray(input.categories)||!input.categories.length||input.categories.length>200)throw new AdminError('Неверный файл каталога.');const categories=input.categories.map(normalizeCategory);const products=input.products.map(p=>({...normalizeProduct(p,categories),_version:(s.draft.products.find(old=>old.id===p.id)?._version||0)+1}));for(const list of[categories,products])if(new Set(list.map(p=>p.id)).size!==list.length)throw new AdminError('Повторяющиеся ID.');const draft={source:s.draft.source,categories,products};publicCatalog(draft,s.revision+1,new Date().toISOString());await update(draft,client);await log(actor,'catalog.restore','draft',client);});},
  async setDeploy(revision,status,runId=null){await query('INSERT INTO kt_deploys VALUES($1,$2,$3,$4) ON CONFLICT(revision) DO UPDATE SET status=EXCLUDED.status,run_id=EXCLUDED.run_id,updated=EXCLUDED.updated',[revision,status,runId,new Date().toISOString()]);},audit:log,
  async setUser(username,password){const client=await pool.connect();try{await client.query('BEGIN');await query('INSERT INTO kt_admin_users VALUES($1,$2) ON CONFLICT(username) DO UPDATE SET password=EXCLUDED.password',[username,password],client);await query('DELETE FROM kt_sessions WHERE username=$1',[username],client);await log('cli','user.reset',username,client);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}},
  user:async username=>(await query('SELECT * FROM kt_admin_users WHERE username=$1',[username]))[0],
  session:async token=>token?(await query('SELECT * FROM kt_sessions WHERE hash=$1 AND expires>$2',[hash(token),Date.now()]))[0]||null:null,
  async createSession(username){await query('DELETE FROM kt_sessions WHERE expires<$1',[Date.now()]);const token=randomUUID()+randomUUID(),csrf=randomUUID(),expires=Date.now()+8*3600000;await query('INSERT INTO kt_sessions VALUES($1,$2,$3,$4)',[hash(token),username,csrf,expires]);return{token,csrf,expires};},
  logout:async token=>{await query('DELETE FROM kt_sessions WHERE hash=$1',[hash(token)]);},
  async loginAllowed(key){await query('DELETE FROM kt_login_limits WHERE expires<$1',[Date.now()]);const row=(await query('SELECT attempts FROM kt_login_limits WHERE key=$1',[key]))[0];return Number(row?.attempts||0)<8;},
  async loginFailure(key){await query('INSERT INTO kt_login_limits VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET attempts=kt_login_limits.attempts+1',[key,Date.now()+15*60000]);},
 };
}
