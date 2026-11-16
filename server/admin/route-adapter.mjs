import {Readable} from 'node:stream';
import {createAdminHandler} from './handler.mjs';
import {createLeadHandler} from '../lead-handler.mjs';
import {getStore} from './store.mjs';
import {checkEstimate,checkProject} from './quote.mjs';
let handlers;
export async function handleRequest(request){
 handlers??={admin:createAdminHandler({siteUrl:process.env.SITE_URL||''}),lead:createLeadHandler({webhookUrl:process.env.LEAD_WEBHOOK_URL,webhookToken:process.env.LEAD_WEBHOOK_TOKEN,siteUrl:process.env.SITE_URL,saveLead:async payload=>(await getStore()).addLead(payload),resolveEstimate:async (selection,project)=>{const catalog=await(await getStore()).published();return project?checkProject(project,catalog):checkEstimate(selection,catalog);}})};
 const stream=request.body?Readable.fromWeb(request.body):Readable.from([]);
 // Vercel overwrites its forwarding header at the platform boundary. A local
 // self-hosted server keeps using its explicitly configured proxy-hop policy.
 const remoteAddress=process.env.VERCEL?(request.headers.get('x-vercel-forwarded-for')||'').split(',').at(-1)?.trim()||'unknown':'local';
 Object.assign(stream,{headers:Object.fromEntries(request.headers),url:request.url,method:request.method,socket:{remoteAddress}});
 return await new Promise(resolve=>{
  const headers=new Headers();const res={statusCode:200,headersSent:false,writableEnded:false,setHeader:(key,value)=>headers.set(key,String(value)),end(body){if(this.writableEnded)return;this.writableEnded=true;this.headersSent=true;resolve(new Response(body??null,{status:this.statusCode,headers}));}};
  (async()=>{const path=new URL(request.url).pathname.replace(/\/$/,'');if(path==='/api/leads'){await handlers.lead(stream,res);return;}if(!await handlers.admin(stream,res)){res.statusCode=404;res.end('Not found');}})().catch(()=>{res.statusCode=500;res.end(JSON.stringify({error:'Не удалось выполнить запрос.'}));});
 });
}
