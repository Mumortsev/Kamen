import {getCatalog} from '@/lib/catalog-data';import {sitemapXml}from'@/lib/sitemap-xml';
export const dynamic='force-dynamic';
export async function GET(){return new Response(sitemapXml(await getCatalog()),{headers:{'Content-Type':'application/xml'}});}
