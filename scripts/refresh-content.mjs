// Run once against the explicitly selected existing stand. No owner changes are overwritten.
import nextEnv from '@next/env';import {neon}from'@neondatabase/serverless';import {readFile,writeFile}from'node:fs/promises';import{publicCatalog}from'../server/admin/validation.mjs';
nextEnv.loadEnvConfig(process.cwd());
const plan=JSON.parse(await readFile(process.argv[2],'utf8'));
const sql=neon(process.env.DATABASE_URL,{fullResults:true});
const {rows:[row]}=await sql.query('SELECT * FROM kt_catalog_state WHERE id=1',[]);
await writeFile('/tmp/kamen-before-content-refresh.json',JSON.stringify(row),{mode:0o600});
let updated=0,updatedCategories=0;const draft=structuredClone(row.draft);
for(const product of draft.products){
 const before=plan.before.products.find(p=>p.id===product.id),after=plan.after.products.find(p=>p.id===product.id);
 if(!before||!after||![before.description,after.description].includes(product.description))continue;
 const previous=JSON.stringify(product);
 product.description=after.description;
 if(product.terms===before.terms)product.terms=after.terms;
 if(product.unit===before.unit){product.unit=after.unit;product.calculator=after.calculator;}
 for(const key of ['saleMode','packSize','minimumOrder','density','densityConfirmed'])if(after[key]!==undefined){const wasDefault=key==='packSize'?product[key]===25:key==='minimumOrder'?product[key]===1:key==='density'?product[key]===1600:product[key]===undefined;if(wasDefault||product[key]===undefined)product[key]=after[key];}
 if(JSON.stringify(product)!==previous){product._version=(product._version||0)+1;updated++;}
}
for(const category of draft.categories){const before=plan.before.categories.find(c=>c.id===category.id),after=plan.after.categories.find(c=>c.id===category.id);if(before&&after&&category.description===before.description&&category.description!==after.description){category.description=after.description;updatedCategories++;}}
if(!updated&&!updatedCategories){console.log('Контент уже обновлён. Изменений нет.');process.exit();}
const revision=row.revision+1,at=new Date().toISOString(),published=publicCatalog(draft,revision,at);
if(!process.argv.includes('--apply')){console.log(JSON.stringify({dryRun:true,revision:row.revision,productsToUpdate:updated}));process.exit();}
const result=await sql.query(`WITH saved AS (UPDATE kt_catalog_state SET draft=$1,published=$2,revision=$3 WHERE id=1 AND revision=$4 RETURNING revision) INSERT INTO kt_audit_log(at,actor,action,target) SELECT $5,'maintenance','content.refresh',revision::text FROM saved RETURNING id`,[JSON.stringify(draft),JSON.stringify(published),revision,row.revision,at]);
if(result.rows.length!==1)throw Error('Каталог изменился во время подготовки. Изменения не применены. Повторите команду.');
console.log(JSON.stringify({updatedProducts:updated,revision,products:published.products.length}));
