import {calculateProject} from '../../lib/project-budget.ts';
import {calculateBudget} from '../../lib/budget.ts';
export function checkEstimate(selection,catalog){
 if(!selection)return null;
 const product=catalog.products.find(p=>p.id===selection.productId&&p.calculator!==false);
 if(selection.revision!==catalog.revision||!product||!['kg','m2'].includes(product.unit)||product.unit==='kg'&&!product.densityConfirmed)return{error:'Каталог изменился. Пересчитайте стоимость по актуальным ценам.'};
 const budget=calculateBudget({product,variantId:selection.variantId,area:selection.area,reserve:selection.reserve,depth:selection.depth,delivery:false,installation:false});
 if(budget.error)return{error:'Параметры материала изменились. Выполните расчёт ещё раз.'};
 const unit=product.unit==='kg'?'кг':'м²';const variant=product.variants.find(v=>v.id===selection.variantId);
 return{material:product.name,area:String(selection.area),summary:[`КаменьТорг23 — расчёт по опубликованному каталогу №${catalog.revision}`,product.name,variant?.label,`Площадь: ${selection.area} м². Запас: ${selection.reserve}%.`,`К заказу: ${budget.quantity} ${unit}.`,budget.quoted?'Стоимость материала — по запросу.':`${budget.rate} ₽/${unit}. Материал: ${budget.total} ₽.`,`Доставка и монтаж рассчитываются отдельно. Не оферта.`].filter(Boolean).join('\n'),calculation:{...selection,...budget}};
}

export function checkProject(selection,catalog){
 if(!selection)return null;
 if(selection.revision!==catalog.revision)return{error:'Цены или состав каталога изменились. Обновите расчёт и отправьте заявку ещё раз.'};
 const available=catalog.products.filter(p=>p.calculator!==false&&p.unit);
 const project=calculateProject(selection,available);
 if(!project.valid)return{error:'Одна из позиций больше не доступна или требует уточнения количества. Обновите проект.'};
 const units={m2:'м²',kg:'кг',piece:'шт.',meter:'пог. м'};
 const summary=['КаменьТорг23 — состав заказа',...project.lines.map(({line,product,result},i)=>`${i+1}. ${product.name}${line.variantId?' / '+product.variants.find(v=>v.id===line.variantId)?.label:''}: ${result.quantity} ${units[product.unit]}; ${result.quoted?'цена по запросу':result.rate+' ₽/'+units[product.unit]+' = '+result.total+' ₽'}${line.installation?'; нужен монтаж':''}${result.packs?'; упаковок: '+result.packs:''}.`),`Материалы с известной ценой: ${project.total} ₽.${project.quoted?' Есть позиции с ценой по запросу.':''}`,`Доставка: ${selection.delivery?'нужна':'самовывоз'}.`,selection.finish?'Пожелание к отделке: '+selection.finish:'','Доставку и работы согласуем отдельно. Предварительный расчёт, не оферта.'].filter(Boolean).join('\n');
 return{material:project.lines.length===1?project.lines[0].product.name:'Проект: '+project.lines.length+' позиций',area:'',summary,calculation:{...selection,lines:project.lines.map(({line,result})=>({...line,...result})),total:project.total}};
}
