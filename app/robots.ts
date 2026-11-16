import type {MetadataRoute} from 'next';import company from '@/data/company.json';
export const dynamic='force-static';
export default function robots():MetadataRoute.Robots{return{rules:(process.env.STATIC_EXPORT==='1'||process.env.DEMO_MODE==='1')?{userAgent:'*',disallow:'/'}:{userAgent:'*',allow:'/',disallow:['/admin/','/api/']},sitemap:new URL(`${(process.env.SITE_URL||company.source).replace(/\/$/,'')}/sitemap.xml`).href};}
