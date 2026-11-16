import portfolio from '@/data/portfolio.json';
import type {Product} from './catalog';
export type SitePhoto={src:string;alt:string;source?:string};
export type SiteImages={portfolio:SitePhoto[];applications:SitePhoto[]};
export const applicationNames=['Фасад и цоколь','Дорожки и площадки','Ландшафт','Ступени и детали'];
export function resolveSiteImages(catalog:{products:Product[];siteImages?:SiteImages}):SiteImages{
 const products=catalog.products;
 const defaults=[products[0],products.find(p=>p.name.includes('Брусчатка'))||products[0],products.find(p=>p.name.includes('Мраморная крошка белая'))||products[0],products.find(p=>/ступен/i.test(p.name))||products[0]];
 return{portfolio:catalog.siteImages?.portfolio??portfolio,applications:catalog.siteImages?.applications??defaults.map((p,i)=>p?.images[0]??{src:'',alt:applicationNames[i]})};
}
