import { isIP } from 'node:net';
import { validateLead } from '../lib/lead-validation.ts';
export function clientAddress(req, trustedHops = 0) {
  const remote = req.socket.remoteAddress || 'unknown';
  if (!trustedHops) return remote;
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(ip => ip.trim());
  if (forwarded.some(ip => !isIP(ip))) return remote;
  const chain = [...forwarded, remote];
  return chain[Math.max(0, chain.length - 1 - trustedHops)];
}
export function createLeadHandler({ webhookUrl, webhookToken, siteUrl, trustedProxyHops=0, send=fetch, now=Date.now, timeoutMs=10000, maxAttempts=5, resolveEstimate, saveLead, notifyLead, recordEmail } = {}) {
  const attempts = new Map();
  let lastCleanup = 0;
  return async function lead(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const answer = (status, body) => { res.statusCode=status; res.end(JSON.stringify(body)); };
    if (req.method !== 'POST') { res.setHeader('Allow','POST'); return answer(405,{error:'Метод не поддерживается.'}); }
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')) return answer(415,{error:'Ожидается JSON.'});
    if (req.headers.origin) {
      try {
        const origin = new URL(req.headers.origin);
        const requestHost = new URL(`http://${req.headers.host}`).host;
        const canonicalOrigin = siteUrl ? new URL(siteUrl).origin : '';
        if (!['http:','https:'].includes(origin.protocol) || (origin.host!==requestHost && origin.origin!==canonicalOrigin)) return answer(403,{error:'Недопустимый источник.'});
      } catch { return answer(403,{error:'Недопустимый источник.'}); }
    }
    const limit=65536;
    if(Number(req.headers['content-length'])>limit){req.resume();return answer(413,{error:'Запрос слишком большой.'});}
    try {
      const chunks=[];let bytes=0;
      for await(const chunk of req.iterator({destroyOnReturn:false})){
        bytes+=chunk.length;
        if(bytes>limit){res.setHeader('Connection','close');req.resume();return answer(413,{error:'Запрос слишком большой.'});}
        chunks.push(chunk);
      }
      let body;
      try { body=JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { return answer(400,{error:'Некорректный JSON.'}); }
      const validation=validateLead(body);
      if(!validation.ok)return answer(400,{error:validation.error});
      const timestamp=now();
      if(timestamp-lastCleanup>=60000){for(const [key,times] of attempts)if(!times.some(t=>timestamp-t<60000))attempts.delete(key);lastCleanup=timestamp;}
      const ip=clientAddress(req,trustedProxyHops);
      const recent=(attempts.get(ip)||[]).filter(t=>timestamp-t<60000);
      if(recent.length>=maxAttempts||(!attempts.has(ip)&&attempts.size>=5000)){res.setHeader('Retry-After','60');return answer(429,{error:'Повторите попытку через минуту.'});}
      recent.push(timestamp);attempts.set(ip,recent);
      const checked=resolveEstimate?await resolveEstimate(validation.value.estimate,validation.value.project):null;
      if(checked?.error)return answer(409,{error:checked.error,code:'CATALOG_CHANGED'});
      const payload={...validation.value,...(checked||{}),source:'kamentorg23',receivedAt:new Date(timestamp).toISOString()};
      delete payload.website;
      const id=saveLead?await saveLead(payload):null;
      const emailTask=notifyLead?Promise.resolve().then(()=>notifyLead(payload)).then(async delivery=>{if(id&&recordEmail)await recordEmail(id,delivery);}).catch(()=>{}):Promise.resolve();
      if(!webhookUrl){await emailTask;if(id)return answer(200,{ok:true,id});return answer(503,{error:'Не удалось сохранить заявку. Позвоните нам или напишите на почту.'});}
      let destination;try{destination=new URL(webhookUrl);if(!['http:','https:'].includes(destination.protocol))throw Error('scheme');}catch{await emailTask;if(id)return answer(200,{ok:true,id});return answer(503,{error:'Отправка не подключена.'});}
      let result;try{result=await send(destination,{method:'POST',headers:{'Content-Type':'application/json',...(webhookToken?{Authorization:`Bearer ${webhookToken}`}:{})},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(timeoutMs)});}catch(error){await emailTask;if(id)return answer(200,{ok:true,id});throw error;}
      await emailTask;
      if(!result.ok&&!id)return answer(502,{error:'Не удалось передать заявку. Попробуйте письмо или звонок.'});
      return answer(200,{ok:true,...(id?{id}:{})});
    }catch{return answer(502,{error:'Не удалось обработать заявку. Попробуйте письмо или звонок.'});}
  };
}
