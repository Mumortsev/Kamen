import catalog from '@/data/catalog.json';
export type Product = Omit<(typeof catalog.products)[number],'characteristics'> & {characteristics:string[];calculator?:boolean;featured?:boolean;order?:number;minimumOrder?:number;density?:number;packSize?:number};
export type Category = (typeof catalog.categories)[number];
import { money,unitLabel } from './format';
export { money,unitLabel } from './format';
export type CalculatorProduct = Pick<Product,'id'|'name'|'terms'|'price'|'unit'|'variants'|'minimumOrder'|'density'|'packSize'> & {images:{src:string;alt:string}[]};
export function productPrice(product: Product) { return product.price > 0 ? `от ${money(product.price)} ₽${product.unit ? '/'+unitLabel(product.unit) : ''}` : 'По запросу'; }
