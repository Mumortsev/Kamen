import type { Metadata } from 'next';
import './globals.css';
import FloatingActions from '@/components/FloatingActions';
import company from '@/data/company.json';
export const metadata:Metadata={
 metadataBase:new URL(process.env.SITE_URL||company.source),
 title:{default:'КаменьТорг23 — природный камень в Краснодаре',template:'%s | КаменьТорг23'},
 description:'Оптовая и розничная продажа природного камня в Краснодаре. Песчаник, златолит, гранит, крошка и галька. Доставка и монтаж. Северная, 26, посёлок Южный.',
 robots:(process.env.STATIC_EXPORT==='1'||process.env.DEMO_MODE==='1')?{index:false,follow:false}:{index:true,follow:true},
 openGraph:{type:'website',locale:'ru_RU',siteName:company.name,title:'КаменьТорг23 — природный камень для вашего дома'},
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body id="top"><a className="skip-link" href="#content">К содержимому</a>{children}<FloatingActions/></body></html>;}
