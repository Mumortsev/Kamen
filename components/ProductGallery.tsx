'use client';
import Image from 'next/image';
import {useRef,useState} from 'react';
import {asset} from '@/lib/paths';
import type {SitePhoto} from '@/lib/site-images';
import './gallery.css';
export default function ProductGallery({images,name}:{images:SitePhoto[];name:string}){
 const [index,setIndex]=useState(0),[direction,setDirection]=useState(1);
 const gesture=useRef<{x:number;y:number}|null>(null),suppressClickUntil=useRef(0);
 const total=images.length,active=total?index%total:0;
 const move=(step:number)=>{setDirection(step);setIndex(old=>(old+step+total)%total);};
 if(!total)return null;
 return <section className="product-carousel" aria-label={`Фотографии: ${name}`} aria-roledescription="карусель" tabIndex={total>1?0:undefined} onKeyDown={e=>{if(total<2)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}}}>
 <div className="product-carousel-stage" onPointerDown={e=>{if(e.pointerType==='touch')gesture.current={x:e.clientX,y:e.clientY};}} onPointerCancel={()=>{gesture.current=null;}} onPointerUp={e=>{const start=gesture.current;gesture.current=null;if(!start||total<2)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2){suppressClickUntil.current=Date.now()+500;move(dx<0?1:-1);}}}>
 <a href={asset(images[active].src)} target="_blank" rel="noopener noreferrer" aria-label="Открыть фотографию крупнее" onClick={e=>{if(Date.now()<suppressClickUntil.current)e.preventDefault();}}><Image key={images[active].src} className={direction<0?'enter-from-left':'enter-from-right'} src={asset(images[active].src)} alt={images[active].alt||name} width={1000} height={800} sizes="(max-width:760px) 90vw, 48vw" loading={active===0?'eager':'lazy'} draggable={false}/></a>
 {total>1?<><button className="gallery-arrow previous" type="button" aria-label="Предыдущее фото" onClick={()=>move(-1)}>←</button><button className="gallery-arrow next" type="button" aria-label="Следующее фото" onClick={()=>move(1)}>→</button><span className="gallery-counter" aria-live="polite" aria-atomic="true">{active+1} / {total}</span></>:null}</div>
 {total>1?<div className="gallery-thumbnails" aria-label="Выбрать фотографию">{images.map((image,i)=><button type="button" key={image.src+'-'+i} aria-label={`Фото ${i+1}`} aria-pressed={i===active} onClick={()=>{setDirection(i<active?-1:1);setIndex(i);}}><Image src={asset(image.src)} alt="" width={90} height={72} sizes="80px" loading="lazy"/></button>)}</div>:null}
 </section>;
}
