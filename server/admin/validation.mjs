import {randomUUID} from 'node:crypto';
export class AdminError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const fail=message=>{throw new AdminError(message);};
function text(value,label,max=300,required=false){if(typeof value!=='string'||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(`Проверьте поле «${label}».`);const out=value.trim();if(required&&!out)fail(`Заполните поле «${label}».`);return out;}
function number(value,label,min=0,max=1e9){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail(`Проверьте поле «${label}».`);return value;}
export function safePath(value){const path=text(value,'Адрес',250,true).replace(/\/$/,'');if(path==='/product'||path==='/category')fail('Добавьте название к адресу страницы.');if(!/^\/(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_-]*$/.test(path)||/^\/(?:admin|api|assets|uploads|_next|catalog|contact|dostavka|montag|portfolio|information|product\/new)(?:$|\/)/.test(path))fail('Недопустимый адрес. Используйте /product/nazvanie или /category/nazvanie.');return path;}
export function normalizeProduct(input,categories){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Некорректный товар.');
 const unit=input.unit===null?null:text(input.unit,'Единица',10);if(![null,'m2','kg','piece','meter'].includes(unit))fail('Выберите единицу продажи.');
 const status=typeof input.visible==='boolean'?(input.visible?'published':'archived'):(input.status||'published');if(!['draft','published','archived'].includes(status))fail('Некорректный статус.');
 if(!Array.isArray(input.categories)||input.categories.length<1||input.categories.length>30||input.categories.some(id=>typeof id!=='string'||!categories.some(c=>c.id===id)))fail('Выберите существующую категорию.');
 if(!Array.isArray(input.images)||input.images.length>24)fail('Допускается до 24 фотографий.');
 const images=input.images.map(image=>{const src=text(image.src,'Фото',180,true);if(!/^(?:imported\/[a-f0-9]+\.webp|\/uploads\/[a-f0-9-]+\.webp|https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/kamentorg\/[a-f0-9-]+\.webp)$/.test(src))fail('Загрузите фотографию через панель.');return{src,alt:text(image.alt||input.name,'Подпись фото',300),source:typeof image.source==='string'?image.source.slice(0,2000):''};});
 if(!Array.isArray(input.variants)||input.variants.length>100)fail('Слишком много вариантов.');
 const variants=input.variants.map(v=>({id:text(v.id||randomUUID(),'ID варианта',80,true),label:text(v.label,'Вариант',200,true),price:number(v.price,'Цена варианта'),sku:text(v.sku||'','Артикул',100)}));
 if(new Set(variants.map(v=>v.id)).size!==variants.length)fail('ID вариантов должны различаться.');
 if(unit==='piece'&&(!Number.isInteger(input.minimumOrder??1)||input.saleMode==='pack'&&!Number.isInteger(input.packSize??1)))fail('Количество штук и размер упаковки должны быть целыми.');
 const calculator=unit!==null&&(input.calculator??true);if(typeof calculator!=='boolean')fail('Проверьте настройку калькулятора.');
 if(status==='published'&&!images.length)fail('Перед публикацией добавьте фотографию.');
 return{id:text(input.id||randomUUID(),'ID',80,true),name:text(input.name,'Название',300,true),description:text(input.description||'','Описание',20000),terms:text(input.terms||'','Условия',3000),price:number(input.price,'Цена'),unit,categories:[...new Set(input.categories)],path:safePath(input.path),source:typeof input.source==='string'?input.source.slice(0,2000):'',images,variants,characteristics:Array.isArray(input.characteristics)?input.characteristics.map(v=>text(v,'Характеристика',500)).slice(0,40):[],status,calculator,featured:input.featured===true,order:number(input.order??0,'Порядок',0,100000),minimumOrder:number(input.minimumOrder??1,'Минимальный заказ',.01,100000),densityConfirmed:input.densityConfirmed===true,saleMode:input.saleMode==='pack'?'pack':'loose',density:number(input.density??1600,'Плотность',1,10000),packSize:number(input.packSize??25,'Фасовка',.01,100000)};
}
export function normalizeCategory(input){if(!input||typeof input!=='object')fail('Некорректная категория.');return{id:text(input.id||randomUUID(),'ID категории',80,true),name:text(input.name,'Категория',200,true),path:safePath(input.path),description:text(input.description||'','Описание',5000),active:input.active!==false,order:number(input.order??0,'Порядок',0,100000)};}
export function publicCatalog(draft,revision,checkedAt){
 const categories=draft.categories.filter(c=>c.active!==false).sort((a,b)=>(a.order??0)-(b.order??0));const ids=new Set(categories.map(c=>c.id));
 const products=draft.products.filter(p=>p.status==='published'&&p.categories.some(id=>ids.has(id))).sort((a,b)=>a.order-b.order).map(({status,_version,...p})=>({...p,categories:p.categories.filter(id=>ids.has(id))}));
 const paths=[...categories,...products].map(p=>p.path);if(new Set(paths).size!==paths.length)fail('Адреса товаров и категорий должны различаться.');
 return{source:draft.source,checkedAt,revision,categories,products};
}

const letters={'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
export function withAutomaticPath(input,draft,kind){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new AdminError('Проверьте данные.');
 const list=kind==='product'?draft.products:draft.categories;
 const existing=list.find(p=>p.id===input.id);
 if(existing)return{...input,path:existing.path};
 const slug=String(input.name||'').toLowerCase().split('').map(c=>letters[c]??c).join('').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120).replace(/-$/,'')||'material';
 const occupied=new Set([...draft.products,...draft.categories].map(p=>p.path));
 const base=`/${kind}/${slug}`;let path=base,n=2;while(occupied.has(path))path=`${base}-${n++}`;
 return{...input,path};
}
