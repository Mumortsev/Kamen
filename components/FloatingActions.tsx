'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import MaxLink from './MaxLink';
import './floating-actions.css';
export default function FloatingActions(){
 const pathname=usePathname(),[visible,setVisible]=useState(false),[editing,setEditing]=useState(false);
 const admin=pathname.split('/').includes('admin');
 useEffect(()=>{
  if(admin)return;
  let scheduled=false;
  const update=()=>{scheduled=false;setVisible(window.scrollY>Math.max(500,window.innerHeight*.8));};
  const scroll=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}};
  const focus=()=>setEditing(document.activeElement instanceof HTMLElement&&!!document.activeElement.closest('input,textarea,select,[contenteditable=true]'));
  update();window.addEventListener('scroll',scroll,{passive:true});document.addEventListener('focusin',focus);document.addEventListener('focusout',focus);
  return()=>{window.removeEventListener('scroll',scroll);document.removeEventListener('focusin',focus);document.removeEventListener('focusout',focus);};
 },[admin,pathname]);
 if(admin||!visible||editing)return null;
 return <div className="floating-actions" aria-label="Быстрые действия"><MaxLink compact/><button className="back-to-top" type="button" aria-label="Вернуться наверх" onClick={()=>{window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}>↑</button></div>;
}
