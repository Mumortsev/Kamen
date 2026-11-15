import { createServer } from 'node:http';
import next from 'next';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const port=Number(process.env.PORT||3000);
const app=next({dev:false,hostname:process.env.HOSTNAME||'0.0.0.0',port});
await app.prepare();
const handle=app.getRequestHandler();
const limits=new Map();
async function lead(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
 const answer=(code,body)=>{res.statusCode=code;res.end(JSON.stringify(body));};
 if(req.method!=='POST')return answer(405,{error:'Method not allowed'});
 if(!req.headers['content-type']?.startsWith('application/json'))return answer(415,{error:'Ожидается JSON'});
 const origin=req.headers.origin;if(origin){try{if(new URL(origin).host!==req.headers.host)return answer(403,{error:'Недопустимый источник'});}catch{return answer(403,{error:'Недопустимый источник'});}}
 let raw='';try{for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>12000)return answer(413,{error:'Запрос слишком большой'});}let body;try{body=JSON.parse(raw);}catch{return answer(400,{error:'Некорректный JSON'});}if(!body||typeof body!=='object')return answer(400,{error:'Некорректный запрос'});
 if(body.website)return answer(400,{error:'Проверьте форму'});
 if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100||typeof body.phone!=='string'||body.phone.replace(/\D/g,'').length<7||body.phone.length>30||body.consent!==true)return answer(400,{error:'Проверьте имя, телефон и согласие'});
 const ip=req.socket.remoteAddress||'unknown',now=Date.now();const attempts=(limits.get(ip)||[]).filter(t=>now-t<60000);if(attempts.length>=5)return answer(429,{error:'Повторите попытку позже'});attempts.push(now);limits.set(ip,attempts);if(limits.size>1000)for(const [key,times]of limits)if(!times.some(t=>now-t<60000))limits.delete(key);
 if(!process.env.LEAD_WEBHOOK_URL)return answer(503,{error:'Отправка ещё не подключена. Напишите на почту или позвоните.'});
 const payload={name:body.name.trim(),phone:body.phone.trim(),location:String(body.location||'').slice(0,200),message:String(body.message||'').slice(0,2000),material:String(body.material||'').slice(0,300),area:String(body.area||'').slice(0,20),summary:String(body.summary||'').slice(0,6000),consent:true,source:'kamentorg23',receivedAt:new Date().toISOString()};
 const response=await fetch(process.env.LEAD_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json',...(process.env.LEAD_WEBHOOK_TOKEN?{Authorization:`Bearer ${process.env.LEAD_WEBHOOK_TOKEN}`}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
 if(!response.ok)return answer(502,{error:'Не удалось доставить заявку'});return answer(200,{ok:true});
 }catch{return answer(502,{error:'Не удалось обработать заявку'});}
}
createServer((req,res)=>{const pathname=new URL(req.url||'/',`http://${req.headers.host}`).pathname;if(pathname==='/api/leads')return void lead(req,res);return void handle(req,res);}).listen(port,'0.0.0.0',()=>console.log(`КаменьТорг23: http://localhost:${port}`));
