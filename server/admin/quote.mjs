import {calculateBudget} from '../../lib/budget.ts';
export function checkEstimate(selection,catalog){
 if(!selection)return null;
 const product=catalog.products.find(p=>p.id===selection.productId&&p.calculator!==false);
 if(selection.revision!==catalog.revision||!product||!['kg','m2'].includes(product.unit))return{error:'Каталог изменился. Пересчитайте стоимость по актуальным ценам.'};
 const budget=calculateBudget({product,variantId:selection.variantId,area:selection.area,reserve:selection.reserve,depth:selection.depth,delivery:false,installation:false});
 if(budget.error)return{error:'Параметры материала изменились. Выполните расчёт ещё раз.'};
 const unit=product.unit==='kg'?'кг':'м²';const variant=product.variants.find(v=>v.id===selection.variantId);
 return{material:product.name,area:String(selection.area),summary:[`КаменьТорг23 — расчёт по опубликованному каталогу №${catalog.revision}`,product.name,variant?.label,`Площадь: ${selection.area} м². Запас: ${selection.reserve}%.`,`К заказу: ${budget.quantity} ${unit}.`,budget.quoted?'Стоимость материала — по запросу.':`${budget.rate} ₽/${unit}. Материал: ${budget.total} ₽.`,`Доставка и монтаж рассчитываются отдельно. Не оферта.`].filter(Boolean).join('\n'),calculation:{...selection,...budget}};
}
