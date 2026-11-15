'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { asset } from '@/lib/paths';
import MobileMenu from './MobileMenu';
import company from '@/data/company.json';

export default function Hero() {
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    const abort = new AbortController();
    Promise.all([import('@/lib/hero-engine'), fetch(asset('hero-manifest.json'), { signal: abort.signal }).then(response => { if (!response.ok) throw Error('manifest'); return response.json(); })])
      .then(([engine, manifest]) => {
        if (!disposed) cleanup = engine.startHero({ manifest, assetUrl: asset, onFinish: (name: string) => window.dispatchEvent(new CustomEvent('stone:finish', { detail: name })), onCalculate: () => window.dispatchEvent(new CustomEvent('stone:task', { detail: 'facade' })) });
        if (!disposed && location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' }));
      }).catch(() => { if (!disposed) { document.documentElement.classList.add('load-error'); const loader = document.getElementById('loader'); if (loader) loader.textContent = 'Анимация недоступна. Каталог и связь с нами работают.'; } });
    return () => { disposed = true; abort.abort(); cleanup?.(); };
  }, []);
  return <main id="story">
    <section className="scene" id="hero" aria-label="Пример облицовки дома природным камнем">
      <picture className="poster"><source media="(max-width:700px), (max-aspect-ratio:4/5)" srcSet={asset('mobile-concrete.webp')} /><img src={asset('desktop-space-concrete.webp')} alt="Одноэтажный дом до облицовки природным камнем" fetchPriority="high" width="1672" height="941" /></picture>
      <canvas id="cladding-settled" aria-hidden="true" /><canvas id="cladding" aria-hidden="true" /><div className="hero-shade" aria-hidden="true" />
      <header className="reveal" id="header" inert hidden>
        <a className="brand" href="#" aria-label={`${company.name} — в начало`}><span className="brand-word">КАМЕНЬТОРГ<span className="brand-number">23</span><small>ПРИРОДНЫЙ КАМЕНЬ</small></span></a>
        <nav aria-label="Основное меню"><Link href="/catalog/">Каталог</Link><a href="#service">Доставка и монтаж</a><a href="#contacts">Контакты</a></nav>
        <a className="phone" href={`tel:${company.phoneHref}`}>{company.phone}</a><MobileMenu/>
      </header>
      <div className="hero-copy reveal" id="copy" inert hidden><p className="eyebrow"><span />ПРИРОДНЫЙ КАМЕНЬ · КРАСНОДАР</p><h1>Вашему дому<br /><span>идёт камень.</span></h1></div>
      <div className="hero-finishes reveal" id="hero-finishes" role="group" aria-label="Визуализация отделки фасада" aria-busy="false" hidden inert>
        <div className="finish-heading"><span>ХАРАКТЕР ВАШЕГО ДОМА</span><span id="finish-name">Тёплый песчаник</span></div>
        <div className="finish-options">{[['light','Светлый'],['sand','Песочный'],['graphite','Графитовый']].map(([key,label])=><button key={key} type="button" data-finish={key} aria-pressed={key==='sand'}><i className={`finish-swatch finish-${key}`} aria-hidden="true" /><span>{label}</span></button>)}</div><p className="finish-status" id="finish-status" role="status" />
      </div>
      <div className="hero-lower reveal" id="lower" inert hidden><p className="description">Природный камень со склада в Краснодаре.<br />От 1 м² или от 1 кг. Доставка и монтаж.</p><div className="actions"><button className="primary" id="request" type="button">Рассчитать фасад <span>↗</span></button><Link className="secondary" href="/catalog/">Подобрать камень <span>↗</span></Link></div></div>
      <div id="cue" className="cue" aria-label="Прокрутите вниз"><svg viewBox="0 0 24 38" aria-hidden="true"><path d="M12 3v30M4 25l8 8 8-8" /></svg></div>
      <div className="bottom-line reveal" id="bottom" hidden><button id="restart" type="button">↺ Посмотреть превращение снова</button><span>ВИЗУАЛИЗАЦИЯ ОТДЕЛКИ · ОТТЕНОК ПАРТИИ УТОЧНЯЕТСЯ</span></div>
      <div id="loader" className="loader" role="status">Загружаем фактуру…</div>
      <noscript><div className="hero-nojs">Природный камень в Краснодаре. <a href="catalog/">Открыть каталог</a> · <a href={`tel:${company.phoneHref}`}>{company.phone}</a></div></noscript>
    </section>
  </main>;
}
