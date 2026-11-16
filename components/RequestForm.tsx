'use client';
import { useEffect, useRef, useState } from 'react';
import company from '@/data/company.json';
import { validateLead,type EstimateSelection } from '@/lib/lead-validation';
const staticBuild=process.env.NEXT_PUBLIC_STATIC_EXPORT==='1';
type Notice={message:string;error:boolean}|null;
export default function RequestForm(){
 const [estimate,setEstimate]=useState<EstimateSelection|undefined>();const [summary,setSummary]=useState('');const [material,setMaterial]=useState('');const [area,setArea]=useState('');
 const [notice,setNotice]=useState<Notice>(null);const [busy,setBusy]=useState(false);const [mail,setMail]=useState('');const [invalidField,setInvalidField]=useState('');
 const pending=useRef<AbortController|null>(null);
 function invalidate(){setNotice(null);setMail('');setInvalidField('');}
 useEffect(()=>{
  const listener=(event:Event)=>{const d=(event as CustomEvent).detail;pending.current?.abort();pending.current=null;setBusy(false);setEstimate(d.estimate);setSummary(d.summary);setMaterial(d.material);setArea(d.area);setNotice(null);setMail('');setInvalidField('');};
  const requested=new URL(location.href).searchParams.get('request');if(requested)setMaterial(requested);
  window.addEventListener('stone:estimate',listener);
  return()=>{window.removeEventListener('stone:estimate',listener);pending.current?.abort();pending.current=null;};
 },[]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(pending.current)return;invalidate();const form=event.currentTarget;const data=new FormData(form);
  const result=validateLead({name:data.get('name'),phone:data.get('phone'),location:data.get('location'),message:data.get('message'),material,area,summary,estimate,website:data.get('website'),consent:data.get('consent')==='on'});
  if(!result.ok){setNotice({message:result.error,error:true});setInvalidField(result.field);(form.elements.namedItem(result.field) as HTMLElement|null)?.focus();return;}
  const body=result.value;
  const text=[`Заявка с сайта ${company.name}`,`Имя: ${body.name}`,`Телефон: ${body.phone}`,`Объект: ${body.location}`,body.summary||`Материал: ${body.material||'Нужен подбор'}\nПлощадь: ${body.area||'Не указана'}`,body.message].filter(Boolean).join('\n\n');
  const mailto=`mailto:${company.email}?subject=${encodeURIComponent('Подбор камня и расчёт заказа')}&body=${encodeURIComponent(text)}`;
  const endpoint=process.env.NEXT_PUBLIC_LEAD_ENDPOINT||(!staticBuild?'/api/leads':'');
  if(!endpoint){setMail(mailto);setNotice({message:'Заявка подготовлена. Откройте письмо и отправьте его на нашу почту — данные ещё не отправлены.',error:false});return;}
  const controller=new AbortController();pending.current=controller;setBusy(true);
  const timeout=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
   if(response.status===409){const conflict=await response.json();setSummary('');setEstimate(undefined);setMail('');setNotice({message:conflict.error||'Каталог изменился. Выполните расчёт ещё раз.',error:true});window.dispatchEvent(new Event('stone:catalog-refresh'));return;}
   if(!response.ok||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')||''))throw Error('send');
   const receipt=await response.json();if(receipt?.ok!==true)throw Error('receipt');
   if(pending.current===controller){setNotice({message:'Заявка отправлена. Мы свяжемся с вами по указанному телефону.',error:false});setMail('');}
  }catch{if(pending.current===controller){setMail(mailto);setNotice({message:'Не удалось отправить заявку. Отправьте подготовленное письмо или позвоните нам.',error:true});}}
  finally{clearTimeout(timeout);if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 return <section className="page-section page-shell estimate-section" id="estimate"><div className="estimate-copy"><p className="section-label">06 / ОБСУДИМ ВАШ ОБЪЕКТ</p><h2>Начнём<br/>с вашего дома.</h2><p>Расскажите о задаче. Подберём камень для облицовки, мощения или ландшафта, обсудим доставку и монтаж.</p><ul className="estimate-points"><li>Покупка со склада от 1 м² или от 1 кг</li><li>Оптовые и розничные заказы</li><li>Материал и работы по отдельной смете</li></ul><p className="estimate-hint">Не знаете породу и площадь?<br/>Начните с описания и консультации.</p><a className="text-action" href={`tel:${company.phoneHref}`}>{company.phone} ↗</a></div>
 <form className="estimate-form" onSubmit={submit} onChange={invalidate}><div className="form-topline"><span>ДЕТАЛИ ВАШЕГО ОБЪЕКТА</span><span>КАМЕНЬТОРГ23</span></div>{summary?<pre className="estimate-budget">{summary}</pre>:null}<div className="form-pair"><label>Материал<input disabled={busy} name="material" value={material} onChange={e=>{setMaterial(e.target.value);setEstimate(undefined);setSummary('');}} placeholder="Помогите выбрать" maxLength={300}/></label><label>Площадь, м²<input disabled={busy} name="area" type="number" min="0.1" max="5000" step="any" value={area} onChange={e=>{setArea(e.target.value);setEstimate(undefined);setSummary('');}} aria-invalid={invalidField==='area'||undefined} placeholder="Если знаете"/></label></div><label>Где находится объект?<input disabled={busy} name="location" autoComplete="address-level2" placeholder="Город или населённый пункт" maxLength={200}/></label><label>Что хотите сделать?<textarea disabled={busy} name="message" rows={3} maxLength={2000} placeholder="Фасад, цоколь, дорожки, отсыпка…"/></label><div className="form-pair"><label>Ваше имя<input disabled={busy} name="name" autoComplete="given-name" required maxLength={100} aria-invalid={invalidField==='name'||undefined}/></label><label>Телефон<input disabled={busy} name="phone" type="tel" autoComplete="tel" inputMode="tel" required minLength={7} maxLength={30} aria-invalid={invalidField==='phone'||undefined}/></label></div><div className="honeypot" aria-hidden="true"><label>Сайт<input disabled={busy} name="website" tabIndex={-1} autoComplete="off"/></label></div><label className="consent"><input disabled={busy} type="checkbox" name="consent" required/>Разрешаю использовать указанные контакты для ответа на моё обращение.</label><button className="dark-button" type="submit" disabled={busy}>{busy?'Отправляем…':staticBuild?'Подготовить заявку':'Получить подбор и расчёт'}<span>↗</span></button>{notice?<div className="request-status" role={notice.error?'alert':'status'}><p>{notice.message}</p>{mail?<a className="dark-button" href={mail}>Открыть письмо <span>↗</span></a>:null}</div>:null}<p className="form-note">{staticBuild?'Здесь заявка готовится для отправки через вашу почту.':'Отправка производится только после нажатия кнопки.'}</p></form></section>;
}
