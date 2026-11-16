import type {CatalogData} from '@/lib/catalog-data';
import seed from '@/data/catalog.json';import {sitemapXml}from'@/lib/sitemap-xml';
export const dynamic='force-static';
export function GET(){return new Response(sitemapXml(seed as CatalogData),{headers:{'Content-Type':'application/xml'}});}
