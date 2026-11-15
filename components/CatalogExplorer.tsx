'use client';
import {useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {asset} from '@/lib/paths';
import {money,unitLabel} from '@/lib/format';
type Item={id:string;name:string;price:number;unit:string|null;terms:string;path:string;categories:string[];image:string};
type Category={id:string;name:string;path:string};
export default function CatalogExplorer({items,categories}:{items:Item[];categories:Category[]}){
 const [query,setQuery]=useState('');const [category,setCategory]=useState('all');const [sort,setSort]=useState('default');
 const visible=items.filter(p=>(category==='all'||p.categories.includes(category))&&`${p.name} ${p.terms}`.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')));
 const shown=sort==='default'?visible:[...visible].sort((a,b)=>sort==='price-up'?(a.price||Infinity)-(b.price||Infinity):sort==='price-down'?(b.price||0)-(a.price||0):a.name.localeCompare(b.name,'ru'));
 return <><div className="catalog-controls"><label>Найти камень<input type="search" placeholder="Песчаник, галька, златолит…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Категория<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">Все категории</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Порядок<select value={sort} onChange={e=>setSort(e.target.value)}><option value="default">Как в каталоге</option><option value="price-up">Сначала дешевле</option><option value="price-down">Сначала дороже</option><option value="name">По названию</option></select></label></div><p className="selection-help" role="status">Найдено: {shown.length}. Цены зависят от варианта и условий заказа.</p><div className="real-product-grid">{shown.map(p=><article key={p.id} className="real-product-card"><Link href={p.path+'/'} prefetch={false} className="real-product-image">{p.image?<Image src={asset(p.image)} alt={p.name} width={600} height={450} loading="lazy"/>:<div className="image-placeholder">Природный камень</div>}</Link><div className="real-product-content"><p className="product-price">{p.price>0?`от ${money(p.price)} ₽${p.unit?'/'+unitLabel(p.unit):''}`:'По запросу'}</p><h2><Link href={p.path+'/'} prefetch={false}>{p.name}</Link></h2><p>{p.terms||'Условия заказа уточняются.'}</p><Link className="text-action" href={p.path+'/'} prefetch={false}>Подробнее <span>↗</span></Link></div></article>)}</div>{shown.length===0?<p className="empty-catalog">По этому запросу ничего не найдено. Попробуйте другое название или позвоните — поможем подобрать камень.</p>:null}</>;
}
