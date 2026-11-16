import {resolve} from 'node:path';
import {AdminError} from './validation.mjs';
let pending;
// Cache initialization itself so concurrent cold-start requests share one pool.
export function getStore(){
 return pending??=(async()=>{
  if(process.env.DATABASE_URL){const{createPostgresStore}=await import('./postgres-store.mjs');return createPostgresStore(process.env.DATABASE_URL);}
  if(process.env.VERCEL)throw new AdminError('Подключите базу PostgreSQL и выполните первоначальную настройку админки.',503);
  const{createStore}=await import('./sqlite-store.mjs');return createStore({directory:process.env.CATALOG_DATA_DIR||resolve('var/catalog')});
 })().catch(error=>{pending=undefined;throw error;});
}
