import {neon} from '@neondatabase/serverless';
import {createPostgresStore} from './postgres-store.mjs';
// Bootstrap only: some trusted development environments cannot open PostgreSQL's
// TCP port. Neon HTTPS runs the same DDL/import; regular application writes keep
// using the transactional PostgreSQL store on its hosting server.
export function createHttpBootstrapStore(){
 const connection=process.env.DATABASE_URL;let host;
 try{host=new URL(connection).hostname;}catch{throw Error('DATABASE_URL is not configured correctly.');}
 if(!host.endsWith('.neon.tech'))throw Error('HTTPS bootstrap is supported only for a Neon database.');
 const sql=neon(connection,{fullResults:true});
 const pool={async query(text,values){
  if(!values&&text.includes(';')){let result={rows:[]};for(const statement of text.split(';').map(s=>s.trim()).filter(Boolean))result=await sql.query(statement,[]);return result;}
  return sql.query(text,values||[]);
 },async end(){}};
 const store=createPostgresStore('',{pool});
 return{initialize:store.initialize,published:store.published,close:store.close,
  async setUser(username,password){await sql.transaction([
   sql.query('INSERT INTO kt_admin_users VALUES($1,$2) ON CONFLICT(username) DO UPDATE SET password=EXCLUDED.password',[username,password]),
   sql.query('DELETE FROM kt_sessions WHERE username=$1',[username]),
   sql.query('INSERT INTO kt_audit_log(at,actor,action,target) VALUES($1,$2,$3,$4)',[new Date().toISOString(),'cli','user.reset',username])
  ]);}
 };
}
