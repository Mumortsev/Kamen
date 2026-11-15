import catalog from '@/data/catalog.json';
export type Product = (typeof catalog.products)[number];
export type Category = (typeof catalog.categories)[number];
export const products = catalog.products;
export const categories = catalog.categories;
import { money,unitLabel } from './format';
export { money,unitLabel } from './format';
export type CalculatorProduct = Pick<Product,'id'|'name'|'terms'|'price'|'unit'|'variants'> & {images:{src:string;alt:string}[]};
export function productPrice(product: Product) { return product.price > 0 ? `от ${money(product.price)} ₽${product.unit ? '/'+unitLabel(product.unit) : ''}` : 'По запросу'; }
