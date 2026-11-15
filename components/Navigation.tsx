import Link from 'next/link';
import MobileMenu from './MobileMenu';
import company from '@/data/company.json';
export function Brand() { return <Link prefetch={false} href="/" className="site-brand"><span>КАМЕНЬТОРГ<span className="brand-number">23</span><small>ПРИРОДНЫЙ КАМЕНЬ</small></span></Link>; }
export default function Navigation({fixed=false}:{fixed?:boolean}) { return <div role="banner" inert={fixed?true:undefined} aria-hidden={fixed?true:undefined} className={fixed?'site-nav':'document-nav'}><Brand/><nav aria-label="Навигация по сайту"><Link prefetch={false} href="/catalog/">Каталог</Link><Link prefetch={false} href="/#portfolio">Наши работы</Link><Link prefetch={false} href="/#service">Доставка и монтаж</Link><Link prefetch={false} href="/#contacts">Контакты</Link></nav><a className="site-nav-cta" href={`tel:${company.phoneHref}`}>{company.phone}</a><MobileMenu/></div>; }
