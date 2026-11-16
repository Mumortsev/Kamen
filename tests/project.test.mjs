import test from 'node:test';import assert from 'node:assert/strict';
import{calculateLine,calculateProject}from'../lib/project-budget.ts';import{checkProject}from'../server/admin/quote.mjs';import{validateLead}from'../lib/lead-validation.ts';import{withAutomaticPath}from'../server/admin/validation.mjs';
const product={id:'p',name:'Товар',price:100,unit:'m2',categories:['a','b'],images:[],variants:[{id:'v',label:'Вариант',price:120,sku:''}],minimumOrder:1};
const line={id:'l',productId:'p',variantId:'',mode:'quantity',amount:10,reserve:10,depth:5,installation:true};
test('project supports square metres, whole pieces, kilograms, linear metres and actual packaging',()=>{
 assert.equal(calculateLine(line,product).total,1100);
 assert.equal(calculateLine({...line,amount:3,reserve:20},{...product,unit:'piece'}).total,300);
 assert(calculateLine({...line,amount:1.5},{...product,unit:'piece'}).error);
 assert.equal(calculateLine({...line,amount:2.3},{...product,unit:'meter'}).quantity,2.3);
 assert.equal(calculateLine({...line,amount:26},{...product,unit:'kg'}).quantity,26);
 assert.equal(calculateLine({...line,amount:26},{...product,unit:'kg',saleMode:'pack',packSize:25}).quantity,50);
 assert.equal(calculateLine({...line,amount:.5,reserve:0},{...product,minimumOrder:10}).quantity,10);
});
test('weight-by-area requires confirmed bulk density and respects reserve and packing',()=>{
 const layer={...line,amount:10,reserve:0,mode:'area'};
 assert(calculateLine(layer,{...product,unit:'kg',density:1600}).error);
 assert.equal(calculateLine(layer,{...product,unit:'kg',density:1500,densityConfirmed:true}).quantity,750);
 assert.equal(calculateLine({...layer,reserve:10},{...product,unit:'kg',density:1500,densityConfirmed:true,saleMode:'pack',packSize:25}).quantity,825);
});
test('server requotes every project line, preserves wishes and excludes price-on-request from subtotal',()=>{
 const p2={...product,id:'p2',unit:'piece',price:0};const catalog={revision:7,products:[product,p2]};
 const selection={revision:7,delivery:true,finish:'Светлый',lines:[{...line,variantId:'v'},{...line,id:'l2',productId:'p2',amount:2}]};
 const q=checkProject(selection,catalog);assert.equal(q.calculation.total,1320);assert(q.summary.includes('нужен монтаж'));assert(q.summary.includes('Доставка: нужна'));assert(q.summary.includes('Светлый'));assert(q.summary.includes('цена по запросу'));
 assert(checkProject({...selection,revision:6},catalog).error);assert(checkProject({...selection,lines:[{...line,productId:'gone'}]},catalog).error);
 assert(checkProject({...selection,lines:[{...line,variantId:'gone'}]},catalog).error);
 assert.equal(calculateProject(selection,catalog.products).quoted,true);
});
test('URL generation transliterates, avoids collisions and retains saved URLs on rename',()=>{
 const draft={products:[],categories:[]};assert.equal(withAutomaticPath({name:'Красный камень'},draft,'product').path,'/product/krasnyy-kamen');
 draft.products.push({id:'1',path:'/product/krasnyy-kamen'});assert.equal(withAutomaticPath({name:'Красный камень'},draft,'product').path,'/product/krasnyy-kamen-2');assert.equal(withAutomaticPath({id:'1',name:'Новое имя',path:'/admin/x'},draft,'product').path,'/product/krasnyy-kamen');
});
test('lead validation caps project size, rejects duplicate line IDs and strips unrelated properties',()=>{
 const payload={name:'Иван',phone:'+79180000000',consent:true,project:{revision:1,delivery:true,finish:'',lines:[line]}};
 assert.equal(validateLead(payload).ok,true);assert.equal(validateLead({...payload,project:{...payload.project,lines:[line,line]}}).ok,false);assert.equal(validateLead({...payload,project:{...payload.project,lines:Array(31).fill(line)}}).ok,false);
});
