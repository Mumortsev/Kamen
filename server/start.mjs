import {sendLeadEmail} from './lead-email.mjs';
import { createServer } from 'node:http';
import next from 'next';
import nextEnv from '@next/env';
import {getStore} from './admin/store.mjs';
import {checkEstimate,checkProject} from './admin/quote.mjs';
import { createAdminHandler } from './admin/handler.mjs';
import { createLeadHandler } from './lead-handler.mjs';
nextEnv.loadEnvConfig(process.cwd());
const port=Number(process.env.PORT||3000);
const dev=process.argv.includes('--dev');
const app=next({dev,hostname:'0.0.0.0',port});
await app.prepare();
const handle=app.getRequestHandler();
const hops=Number(process.env.TRUST_PROXY_HOPS||0);
if(!Number.isInteger(hops)||hops<0||hops>10)throw Error('TRUST_PROXY_HOPS must be an integer from 0 to 10');
const lead=createLeadHandler({webhookUrl:process.env.LEAD_WEBHOOK_URL,webhookToken:process.env.LEAD_WEBHOOK_TOKEN,siteUrl:process.env.SITE_URL,trustedProxyHops:hops,notifyLead:sendLeadEmail,recordEmail:async(id,delivery)=>(await getStore()).setLeadEmail(id,delivery),saveLead:async payload=>(await getStore()).addLead(payload),resolveEstimate:async (selection,project)=>{const catalog=await(await getStore()).published();return project?checkProject(project,catalog):checkEstimate(selection,catalog);}});
const admin=createAdminHandler({siteUrl:process.env.SITE_URL,trustedProxyHops:hops});
const server=createServer(async(req,res)=>{
  try{
    // Parse paths independently of a user-controlled Host header.
    const pathname=new URL(req.url||'/','http://localhost').pathname;
    if(await admin(req,res))return;
    if(pathname==='/api/leads')return void lead(req,res);
    void handle(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end('Не удалось обработать запрос.');});
  }catch{res.writeHead(400);res.end('Некорректный адрес запроса.');}
});
server.requestTimeout=30000;
server.headersTimeout=15000;
if(dev)server.on('upgrade',app.getUpgradeHandler());
server.listen(port,'0.0.0.0',()=>console.log(`КаменьТорг23: http://localhost:${port}`));
