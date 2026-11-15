import type { CalculatorProduct as Product } from './catalog';
export type BudgetInput = { product: Product; variantId: string; area: number; reserve: number; depth: number; delivery: boolean; installation: boolean };
export function calculateBudget(input: BudgetInput) {
  const { product, area, reserve, depth } = input;
  const error = !Number.isFinite(area) || area<=0 || area>5000 ? 'Укажите площадь от 0,1 до 5 000 м².' : !Number.isFinite(reserve)||reserve<0||reserve>20 ? 'Запас должен быть от 0 до 20%.' : product.unit==='kg'&&(!Number.isFinite(depth)||depth<1||depth>20) ? 'Выберите слой от 1 до 20 см.' : null;
  const variant = product.variants.find(item=>item.id===input.variantId);
  const rate = variant?.price ?? product.price;
  const bulk = product.unit==='kg';
  const bags = Math.ceil(area*(1+reserve/100)*depth/100*1600/25-1e-9);
  const quantity = bulk ? bags*25 : Math.ceil(area*(1+reserve/100)*10-1e-9)/10;
  return { error, rate, quantity, bags, total: Math.round(rate*quantity), quoted: rate<=0, bulk };
}
