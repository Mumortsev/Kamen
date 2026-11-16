import {cache} from 'react';
import {connection} from 'next/server';
import seed from '@/data/catalog.json';
import type {Product,Category} from './catalog';
export type CatalogData={products:Product[];categories:Category[];revision?:number;checkedAt:string;source:string};
// Pages gets one immutable build snapshot. The server reads the published database
// once per request, shared by metadata, cards and calculator through React cache.
export const getCatalog=cache(async():Promise<CatalogData>=>{
 if(process.env.STATIC_EXPORT==='1')return seed as CatalogData;
 await connection();
 const {getStore}=await import('../server/admin/store.mjs');
 if(process.env.VERCEL&&!process.env.DATABASE_URL)return seed as CatalogData;
 const store=await getStore();return await store.published() as CatalogData;
});
