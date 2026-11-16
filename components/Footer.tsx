import MaxLink from './MaxLink';
import Link from 'next/link';
import company from '@/data/company.json';
import { Brand } from './Navigation';
export default function Footer() { return <footer className="site-footer page-shell" id="contacts"><div className="footer-top"><Brand/><div><p>Оптовая и розничная продажа<br/>природного камня. Доставка и монтаж.</p><p><a href={company.mapUrl} target="_blank" rel="noopener noreferrer">{company.address} ↗</a></p></div><div className="footer-contacts"><a href={`tel:${company.phoneHref}`}>{company.phone}</a><a href={`mailto:${company.email}`}>{company.email}</a><MaxLink/><small>Перед поездкой уточните наличие нужного камня.</small></div></div><div className="footer-bottom"><span>© {company.name}, 2026</span><span>Камень для облицовки, мощения и ландшафта. Дом в первом экране — визуализация отделки.</span><Link prefetch={false} href="/information/">О природном камне</Link><a href="#top">Наверх ↑</a></div></footer>; }
