const priceFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
export const money = (value: number) => priceFormatter.format(value);
export function unitLabel(unit: string | null) { return unit === 'm2' ? 'м²' : unit === 'kg' ? 'кг' : unit === 'piece' ? 'шт.' : ''; }
