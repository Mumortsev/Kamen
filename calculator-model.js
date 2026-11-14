'use strict';
/** Pure budget model. Published base rates and every estimated assumption live in pricing.json. */
function calculateStoneBudget(input,pricing){
 const errors=[];const material=pricing.materials.find(item=>item.id===input.materialId);
 const area=Number(input.area),reserve=Number(input.reserve),thickness=Number(input.thickness),depth=Number(input.depth),distance=input.delivery?Number(input.distance):0;
 if(!Number.isFinite(area)||area<=0||area>5000)errors.push('Укажите площадь больше 0 и не более 5 000 м².');
 if(!Number.isFinite(reserve)||reserve<0||reserve>20)errors.push('Запас должен быть от 0 до 20%.');
 if(!material||!material.uses.includes(input.task))errors.push('Выберите материал, подходящий для этой задачи.');
 if(input.delivery&&(!Number.isFinite(distance)||distance<0||distance>300))errors.push('Расстояние должно быть от 0 до 300 км в одну сторону.');
 const hasCustom=input.customPrice!==''&&input.customPrice!==null&&input.customPrice!==undefined;const customPrice=hasCustom?Number(input.customPrice):null;
 if(hasCustom&&(!Number.isFinite(customPrice)||customPrice<=0||customPrice>1000000))errors.push('Укажите свою цену больше 0 и не более 1 000 000 ₽ за единицу.');
 if(material?.unit==='m2'&&!Object.hasOwn(pricing.thicknessFactors,String(thickness)))errors.push('Выберите толщину камня.');
 if(material?.unit==='kg'&&(!Number.isFinite(depth)||depth<1||depth>20))errors.push('Выберите слой отсыпки от 1 до 20 см.');
 if(errors.length)return{valid:false,errors};
 const bulk=material.unit==='kg';const stockedArea=area*(1+reserve/100);
 const bags=bulk?Math.ceil((stockedArea*depth/100*pricing.bulkDensityKgM3-1e-9)/pricing.bagKg):0;
 const quantity=bulk?bags*pricing.bagKg:Math.ceil((stockedArea-1e-9)*10)/10;
 const massKg=bulk?quantity:quantity*thickness/1000*pricing.stoneDensityKgM3;
 const factor=bulk||hasCustom?1:pricing.thicknessFactors[String(thickness)];
 const rate=Math.round((hasCustom?customPrice:material.rate*factor)*100)/100;
 const materialCost=Math.round(quantity*rate);
 const installationRate=pricing.installation[input.task];const installationCost=input.installation?Math.round(area*installationRate):0;
 let vehicle=null,trips=0,deliveryCost=0;
 if(input.delivery){vehicle=pricing.deliveryVehicles.find(item=>massKg<=item.capacityKg)||pricing.deliveryVehicles[pricing.deliveryVehicles.length-1];trips=Math.ceil(massKg/vehicle.capacityKg);deliveryCost=Math.round(trips*(vehicle.base+distance*2*pricing.deliveryPerKm))}
 const total=materialCost+installationCost+deliveryCost;
 return{valid:true,material,task:input.task,area,reserve,thickness,depth,quantity,bags,massKg,rate,factor,hasCustom,materialCost,installationRate,installationCost,deliveryCost,vehicle,trips,distance,total,delivery:Boolean(input.delivery),installation:Boolean(input.installation)};
}
if(typeof module!=='undefined'&&module.exports)module.exports={calculateStoneBudget};
