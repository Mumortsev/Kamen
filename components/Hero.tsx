'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { asset } from '@/lib/paths';
import MobileMenu from './MobileMenu';
import company from '@/data/company.json';
import './hero.css';

export default function Hero() {
  const [surface, setSurface] = useState<'facade' | 'path'>('facade');
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    let fallbackCleanup: (()=>void)|undefined;
    const showFallback=()=>{
      if(disposed)return;
      document.documentElement.classList.add('load-error','hero-visible');
      const scene=document.getElementById('hero');scene?.style.setProperty('--reveal','1');scene?.style.setProperty('--cue','0');
      for(const id of ['hero-path','hero-pebbles']){const layer=document.getElementById(id);if(layer)layer.style.visibility='hidden';}
      for(const id of ['header','copy','lower','bottom']){const node=document.getElementById(id);if(node){node.hidden=false;node.inert=false;node.setAttribute('aria-hidden','false');}}
      const picker=document.getElementById('hero-finishes');if(picker){picker.hidden=true;picker.inert=true;}
      const cue=document.getElementById('cue');if(cue)cue.style.visibility='hidden';
      const loader=document.getElementById('loader');if(loader)loader.textContent='Визуализация недоступна. Каталог и расчёт работают.';
      if(!fallbackCleanup){const update=()=>{const story=document.getElementById('story');const past=Boolean(story&&story.getBoundingClientRect().bottom<innerHeight*.45);document.documentElement.classList.toggle('past-hero',past);const nav=document.querySelector<HTMLElement>('.site-nav');if(nav){nav.inert=!past;nav.setAttribute('aria-hidden',String(!past));}};window.addEventListener('scroll',update,{passive:true});update();fallbackCleanup=()=>window.removeEventListener('scroll',update);}
    };
    const abort = new AbortController();
    Promise.all([import('@/lib/hero-engine'), fetch(asset('hero-manifest.json'), { signal: abort.signal }).then(response => { if (!response.ok) throw Error('manifest'); return response.json(); })])
      .then(([engine, manifest]) => {
        if (!disposed) cleanup = engine.startHero({ manifest, assetUrl: asset, onFinish: (name: string) => window.dispatchEvent(new CustomEvent('stone:finish', { detail: name })), onError: showFallback, onReady:()=>{fallbackCleanup?.();fallbackCleanup=undefined;} });
        if (!disposed && location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' }));
      }).catch(showFallback);
    return () => { disposed = true; abort.abort(); cleanup?.();fallbackCleanup?.(); };
  }, []);
  const scrollTop=(event:React.MouseEvent)=>{event.preventDefault();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  const calculate=()=>{window.dispatchEvent(new CustomEvent('stone:task',{detail:'facade'}));document.getElementById('calculator')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  return <div id="story">
    <section className="scene" id="hero" aria-label="Облицовка дома и отсыпка дорожки природным камнем">
      <picture className="poster"><source media="(max-width:700px), (max-aspect-ratio:4/5)" srcSet={asset('mobile-concrete.webp')} /><img src={asset('desktop-space-concrete.webp')} alt="Одноэтажный дом до облицовки природным камнем" fetchPriority="high" width="1672" height="941" /></picture>
      <div className="hero-path" id="hero-path" aria-hidden="true" /><canvas id="cladding-settled" aria-hidden="true" /><canvas id="cladding" aria-hidden="true" /><canvas className="hero-pebbles" id="hero-pebbles" aria-hidden="true" /><div className="hero-shade" aria-hidden="true" />
      <header className="reveal" id="header" inert hidden>
        <a className="brand" href="#" onClick={scrollTop} aria-label={`${company.name} — в начало`}><span className="brand-word">КАМЕНЬТОРГ<span className="brand-number">23</span><small>ПРИРОДНЫЙ КАМЕНЬ</small></span></a>
        <nav aria-label="Основное меню"><Link prefetch={false} href="/catalog/">Каталог</Link><a href="#service">Доставка и монтаж</a><a href="#contacts">Контакты</a></nav>
        <a className="phone" href={`tel:${company.phoneHref}`}>{company.phone}</a><MobileMenu/>
      </header>
      <div className="hero-copy reveal" id="copy" inert hidden><p className="eyebrow"><span />ПРИРОДНЫЙ КАМЕНЬ · КРАСНОДАР</p><h1>Вашему дому<br /><span>идёт камень.</span></h1></div>
      <div className="hero-finishes reveal" id="hero-finishes" role="group" aria-label="Выбор отделки" hidden inert>
        <div className="surface-switch" role="group" aria-label="Поверхность">
          <button type="button" aria-pressed={surface==='facade'} aria-controls="facade-options" onClick={()=>setSurface('facade')}>Фасад</button>
          <button type="button" aria-pressed={surface==='path'} aria-controls="path-options" onClick={()=>setSurface('path')}>Дорожка</button>
        </div>
        <div id="facade-options" aria-busy="false" hidden={surface!=='facade'}>
          <div className="finish-heading"><span id="finish-name">Тёплый песчаник</span></div>
          <div className="finish-options">{[['light','Светлый'],['sand','Песочный'],['graphite','Графитовый']].map(([key,label])=><button key={key} type="button" data-finish={key} aria-pressed={key==='sand'}><i className={`finish-swatch finish-${key}`} aria-hidden="true" /><span>{label}</span></button>)}</div>
          <p className="finish-status" id="finish-status" role="status" />
        </div>
        <div id="path-options" aria-busy="false" hidden={surface!=='path'}>
          <div className="finish-heading"><span id="path-name">Медовая мраморная крошка</span></div>
          <div className="finish-options">{[['white','Белая','4f5800741b5d0ecd'],['honey','Медовая','8eae6285634c814e'],['black','Чёрная','7f2f458e902c3bb7']].map(([key,label,photo])=><button key={key} type="button" data-path-finish={key} aria-pressed={key==='honey'}><i className="finish-swatch path-swatch" style={{backgroundImage:`url(${asset(`imported/${photo}.webp`)})`}} aria-hidden="true" /><span>{label}</span></button>)}</div>
          <p className="finish-status" id="path-status" role="status" />
        </div>
      </div>
      <div className="hero-lower reveal" id="lower" inert hidden><p className="description">Природный камень со склада в Краснодаре.<br />От 1 м² или от 1 кг. Доставка и монтаж.</p><div className="actions"><button className="primary" onClick={calculate} id="request" type="button">Рассчитать фасад <span>↗</span></button><Link prefetch={false} className="secondary" href="/catalog/">Подобрать камень <span>↗</span></Link></div></div>
      <div id="cue" className="cue" role="img" aria-label="Прокрутите страницу вниз">
        <svg className="cue-arrow" viewBox="0 0 24 38" aria-hidden="true"><path d="M12 3v30M4 25l8 8 8-8" /></svg>
        <svg className="cue-swipe" viewBox="0 0 52 66" aria-hidden="true">
          <rect x="11" y="4" width="30" height="53" rx="7" className="swipe-screen" />
          <path d="M25 44V16" className="swipe-track" />
          <g className="swipe-finger">
            <circle cx="25" cy="38" r="4" className="swipe-touch" />
            <path d="M19 60l-4-6a2.3 2.3 0 0 1 3.5-2.9l3.5 3.4V39a2.5 2.5 0 0 1 5 0v9l2-1.8a2.3 2.3 0 0 1 3.6 1.4l.4 1.3a2.4 2.4 0 0 1 3.5 1.4l.4 1.2a2.4 2.4 0 0 1 3.6 1.9v4.7a7.5 7.5 0 0 1-7.5 7.5h-5.5A10 10 0 0 1 19 60Z" />
          </g>
        </svg>
      </div>
      <div className="bottom-line reveal" id="bottom" hidden><button onClick={scrollTop} id="restart" type="button">↺ Посмотреть превращение снова</button><span>ВИЗУАЛИЗАЦИЯ ОТДЕЛКИ · ОТТЕНОК ПАРТИИ УТОЧНЯЕТСЯ</span></div>
      <div id="loader" className="loader" role="status">Загружаем фактуру…</div>
      <noscript><div className="hero-nojs">Природный камень в Краснодаре. <a href="catalog/">Открыть каталог</a> · <a href={`tel:${company.phoneHref}`}>{company.phone}</a></div></noscript>
    </section>
  </div>;
}
