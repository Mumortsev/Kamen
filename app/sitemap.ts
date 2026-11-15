import type {MetadataRoute} from 'next';import {products,categories} from '@/lib/catalog';import company from '@/data/company.json';
import articles from '@/data/articles.json';
export const dynamic='force-static';
export default function sitemap():MetadataRoute.Sitemap{const base=process.env.SITE_URL||company.source;return [...new Set(['','/catalog',...categories.map(c=>c.path),...products.map(p=>p.path),...articles.map(a=>a.path),'/contact','/dostavka','/montag','/portfolio','/information'])].map(path=>({url:base+path+'/',lastModified:'2026-11-15',changeFrequency:'monthly' as const,priority:path===''?1:path==='/catalog'?.9:.6}));}
