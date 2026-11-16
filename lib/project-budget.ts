import type {CalculatorProduct} from './catalog';
export type ProjectLine={id:string;productId:string;variantId:string;mode:'quantity'|'area';amount:number;reserve:number;depth:number;installation:boolean};
export type ProjectSelection={revision:number;lines:ProjectLine[];delivery:boolean;finish:string};
export function calculateLine(line:ProjectLine,product:CalculatorProduct){
 const variant=product.variants.find(v=>v.id===line.variantId);
 const rate=variant?.price??product.price;
 const fail=(error:string)=>({error,quantity:0,total:0,rate,quoted:rate===0,packs:0});
 if(line.variantId&&!variant)return fail('Выберите доступный вариант.');
 if(!product.unit)return fail('Количество и стоимость согласуем с менеджером.');
 if(!Number.isFinite(line.amount)||line.amount<=0||line.amount>1e7)return fail('Введите количество больше нуля, до 10 000 000.');
 if(product.unit==='piece'&&!Number.isInteger(line.amount))return fail('Количество штук должно быть целым.');
 if(!Number.isFinite(rate)||rate<0)return fail('Уточните цену материала.');
 if(!Number.isFinite(line.reserve)||line.reserve<0||line.reserve>20)return fail('Запас: от 0 до 20%.');
 if(!['quantity','area'].includes(line.mode))return fail('Выберите способ расчёта.');
 let raw=line.amount;
 if(product.unit==='m2')raw*=1+line.reserve/100;
 if(product.unit==='kg'&&line.mode==='area'){
  if(!product.densityConfirmed||!product.density||product.density<=0)return fail('Для расчёта слоя нужна подтверждённая насыпная плотность. Укажите вес напрямую.');
  if(!Number.isFinite(line.depth)||line.depth<1||line.depth>100)return fail('Толщина слоя: от 1 до 100 см.');
  raw*=line.depth/100*product.density*(1+line.reserve/100);
 }
 const minimum=product.minimumOrder??1;
 if(!Number.isFinite(minimum)||minimum<=0)return fail('Уточните минимальный заказ.');
 const step=product.unit==='piece'||product.unit==='kg'?1:.1;
 let quantity=Math.ceil((Math.max(raw,minimum)-1e-9)/step)*step;
 let packs=0;
 if(product.saleMode==='pack'){
  if(!product.packSize||product.packSize<=0||!Number.isFinite(product.packSize)||product.unit==='piece'&&!Number.isInteger(product.packSize))return fail('Уточните размер упаковки.');
  packs=Math.ceil((quantity-1e-9)/product.packSize);quantity=packs*product.packSize;
 }
 quantity=Math.round(quantity*1000)/1000;
 if(!Number.isSafeInteger(Math.round(rate*quantity*100)))return fail('Слишком большой объём для онлайн-расчёта. Обратитесь к менеджеру.');
 return {error:null,quantity,rate,total:Math.round(rate*quantity*100)/100,quoted:rate===0,packs};
}
export function calculateProject(selection:ProjectSelection,products:CalculatorProduct[]){
 const lines=selection.lines.map(line=>{const product=products.find(p=>p.id===line.productId);return{line,product,result:product?calculateLine(line,product):{error:'Материал больше не доступен. Выберите другой.',quantity:0,total:0,rate:0,quoted:false,packs:0}};});
 return{lines,total:Math.round(lines.reduce((sum,item)=>sum+(!item.result.error?item.result.total:0),0)*100)/100,quoted:lines.some(item=>item.result.quoted),valid:lines.length>0&&lines.every(item=>!item.result.error)};
}
