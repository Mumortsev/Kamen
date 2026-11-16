import seed from '@/data/catalog.json';import {sitemapXml}from'@/lib/sitemap-xml';
export const dynamic='force-static';
export function GET(){return new Response(sitemapXml(seed),{headers:{'Content-Type':'application/xml'}});}
