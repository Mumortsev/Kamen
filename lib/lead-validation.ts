import type {ProjectSelection} from './project-budget';
export type EstimateSelection={productId:string;variantId:string;area:number;reserve:number;depth:number;revision:number};
export type LeadPayload = {
  name: string; phone: string; location: string; message: string;
  material: string; area: string; summary: string; website: string; consent: boolean; estimate?:EstimateSelection; project?:ProjectSelection;
};
type TextField = Exclude<keyof LeadPayload, 'consent'|'estimate'|'project'>;
type Validation = { ok: true; value: LeadPayload } | { ok: false; error: string; field: keyof LeadPayload };
const limits: Record<TextField, number> = { name:100, phone:30, location:200, message:2000, material:300, area:20, summary:16000, website:200 };
export function validateLead(input: unknown): Validation {
  const fail = (error: string, field: keyof LeadPayload): Validation => ({ ok:false, error, field });
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('Проверьте данные заявки.', 'name');
  const source = input as Record<string, unknown>;
  const value: LeadPayload = {name:'',phone:'',location:'',message:'',material:'',area:'',summary:'',website:'',consent:false};
  for (const key of Object.keys(limits) as TextField[]) {
    if (source[key] !== undefined && typeof source[key] !== 'string') return fail('Проверьте данные заявки.', key);
    value[key] = ((source[key] as string | undefined) || '').trim();
    if (value[key].length > limits[key]) return fail('Текст слишком длинный. Сократите его и попробуйте снова.', key);
  }
  if (value.website) return fail('Проверьте данные заявки.', 'website');
  if (!value.name || /[\u0000-\u001f\u007f]/.test(value.name)) return fail('Укажите ваше имя.', 'name');
  const digits = value.phone.replace(/\D/g, '');
  if (!/^\+?[0-9 ().-]+$/.test(value.phone) || digits.length<7 || digits.length>15) return fail('Укажите корректный телефон: от 7 до 15 цифр.', 'phone');
  if (value.area && (!Number.isFinite(Number(value.area)) || Number(value.area)<.1 || Number(value.area)>5000)) return fail('Укажите площадь от 0,1 до 5 000 м² или оставьте поле пустым.', 'area');
  if (source.consent !== true) return fail('Разрешите использовать контакты для ответа на обращение.', 'consent');
  if(source.estimate!==undefined){
    const e=source.estimate as Record<string,unknown>;
    if(!e||typeof e!=='object'||Array.isArray(e)||typeof e.productId!=='string'||e.productId.length>80||typeof e.variantId!=='string'||e.variantId.length>80||!['area','reserve','depth','revision'].every(key=>typeof e[key]==='number'&&Number.isFinite(e[key]))||!Number.isInteger(e.revision)||Number(e.revision)<1)return fail('Проверьте параметры расчёта.','summary');
    value.estimate={productId:e.productId,variantId:e.variantId,area:Number(e.area),reserve:Number(e.reserve),depth:Number(e.depth),revision:Number(e.revision)};
  }
  if(source.project!==undefined){
    const project=source.project as ProjectSelection;
    if(!project||typeof project!=='object'||!Number.isInteger(project.revision)||project.revision<1||typeof project.delivery!=='boolean'||typeof project.finish!=='string'||project.finish.length>200||!Array.isArray(project.lines)||!project.lines.length||project.lines.length>30)return fail('Проверьте состав проекта.','summary');
    const ids=new Set<string>();
    for(const line of project.lines){if(!line||typeof line!=='object'||typeof line.id!=='string'||line.id.length>80||ids.has(line.id)||typeof line.productId!=='string'||line.productId.length>80||typeof line.variantId!=='string'||line.variantId.length>80||!['quantity','area'].includes(line.mode)||typeof line.installation!=='boolean'||!['amount','reserve','depth'].every(key=>typeof line[key as keyof typeof line]==='number'&&Number.isFinite(line[key as keyof typeof line])))return fail('Проверьте позиции проекта.','summary');ids.add(line.id);}
    value.project={revision:project.revision,delivery:project.delivery,finish:project.finish,lines:project.lines.map(({id,productId,variantId,mode,amount,reserve,depth,installation})=>({id,productId,variantId,mode,amount,reserve,depth,installation}))};
  }
  value.consent = true;
  return {ok:true,value};
}
