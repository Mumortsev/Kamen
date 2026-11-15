'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import company from '@/data/company.json';

const links = [
  ['/catalog/', 'Каталог камня'],
  ['/#calculator', 'Рассчитать материал'],
  ['/portfolio/', 'Наши работы'],
  ['/montag/', 'Монтаж'],
  ['/dostavka/', 'Доставка и оплата'],
  ['/information/', 'О природном камне'],
  ['/contact/', 'Контакты'],
];

export default function MobileMenu() {
  const id = useId();
  const panel = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const scrollStyles = useRef<{ html: string; x: number; y: number } | null>(null);
  function unlock(restorePosition = true) {
    const saved = scrollStyles.current;
    if (!saved) return;
    scrollStyles.current = null;
    document.documentElement.style.overflow = saved.html;
    if (restorePosition) {
      window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
      trigger.current?.focus({ preventScroll: true });
    }
  }
  function close() {
    panel.current?.close();
    unlock();
    setOpen(false);
  }
  function show() {
    if (!panel.current || panel.current.open) return;
    scrollStyles.current = { html: document.documentElement.style.overflow, x: scrollX, y: scrollY };
    panel.current.showModal();
    document.documentElement.style.overflow = 'hidden';
    window.scrollTo({ left: scrollStyles.current.x, top: scrollStyles.current.y, behavior: 'instant' });
    setOpen(true);
  }
  useEffect(() => {
    setMounted(true);
    const media = matchMedia('(max-width:700px), (max-aspect-ratio:4/5)');
    const resize = () => { if (!media.matches) { panel.current?.close(); unlock(); setOpen(false); } };
    media.addEventListener('change', resize);
    return () => { media.removeEventListener('change', resize); unlock(false); };
  }, []);
  return <>
    <button ref={trigger} type="button" className="mobile-menu-trigger" aria-label="Открыть меню" aria-controls={mounted?id:undefined} aria-expanded={open} onClick={show}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    {mounted ? createPortal(<dialog ref={panel} id={id} className="mobile-menu-panel" aria-labelledby={`${id}-title`} onClose={() => { unlock(); setOpen(false); }} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }}>
      <div className="mobile-menu-heading"><span id={`${id}-title`}>КАМЕНЬТОРГ<span className="brand-number">23</span><small>ПРИРОДНЫЙ КАМЕНЬ</small></span><button type="button" className="mobile-menu-close" aria-label="Закрыть меню" onClick={close} autoFocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
      <nav className="mobile-menu-links" aria-label="Мобильная навигация">{links.map(([href,label],index)=><Link key={href} href={href} prefetch={false} onClick={close}><span>{label}</span><small aria-hidden="true">0{index+1}</small></Link>)}</nav>
      <div className="mobile-menu-contact"><a className="mobile-menu-phone" href={`tel:${company.phoneHref}`} onClick={close}>{company.phone}</a><a href={`mailto:${company.email}`} onClick={close}>{company.email}</a><p>{company.address}</p><a href={company.mapUrl} target="_blank" rel="noopener noreferrer" onClick={close}>Построить маршрут ↗</a></div>
    </dialog>, document.body) : null}
  </>;
}
