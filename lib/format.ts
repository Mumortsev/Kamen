export const money = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
export function unitLabel(unit: string | null) { return unit === 'm2' ? 'м²' : unit === 'kg' ? 'кг' : unit === 'piece' ? 'шт.' : ''; }
