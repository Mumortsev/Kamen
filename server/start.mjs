import { createServer } from 'node:http';
import next from 'next';
import nextEnv from '@next/env';
import { createLeadHandler } from './lead-handler.mjs';
nextEnv.loadEnvConfig(process.cwd());
const port=Number(process.env.PORT||3000);
const app=next({dev:false,hostname:'0.0.0.0',port});
await app.prepare();
const handle=app.getRequestHandler();
const hops=Number(process.env.TRUST_PROXY_HOPS||0);
if(!Number.isInteger(hops)||hops<0||hops>10)throw Error('TRUST_PROXY_HOPS must be an integer from 0 to 10');
const lead=createLeadHandler({webhookUrl:process.env.LEAD_WEBHOOK_URL,webhookToken:process.env.LEAD_WEBHOOK_TOKEN,siteUrl:process.env.SITE_URL,trustedProxyHops:hops});
const server=createServer((req,res)=>{
  try{
    // Parse paths independently of a user-controlled Host header.
    const pathname=new URL(req.url||'/','http://localhost').pathname;
    if(pathname==='/api/leads')return void lead(req,res);
    void handle(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end('Не удалось обработать запрос.');});
  }catch{res.writeHead(400);res.end('Некорректный адрес запроса.');}
});
server.requestTimeout=30000;
server.headersTimeout=15000;
server.listen(port,'0.0.0.0',()=>console.log(`КаменьТорг23: http://localhost:${port}`));
