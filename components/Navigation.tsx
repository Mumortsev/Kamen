import Link from 'next/link';
import MobileMenu from './MobileMenu';
import company from '@/data/company.json';
export function Brand() { return <Link href="/" className="site-brand"><span>КАМЕНЬТОРГ<span className="brand-number">23</span><small>ПРИРОДНЫЙ КАМЕНЬ</small></span></Link>; }
export default function Navigation({fixed=false}:{fixed?:boolean}) { return <div className={fixed?'site-nav':'document-nav'}><Brand/><nav aria-label="Навигация по сайту"><Link href="/catalog/">Каталог</Link><Link href="/#portfolio">Наши работы</Link><Link href="/#service">Доставка и монтаж</Link><Link href="/#contacts">Контакты</Link></nav><a className="site-nav-cta" href={`tel:${company.phoneHref}`}>{company.phone}</a><MobileMenu/></div>; }
