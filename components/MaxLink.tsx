import company from '@/data/company.json';
export default function MaxLink({compact=false}:{compact?:boolean}){
 return <a className={compact?'max-link compact':'max-link'} href={company.maxUrl} target="_blank" rel="noopener noreferrer" aria-label={`Написать в MAX: ${company.maxPhone}`}><span className="max-symbol" aria-hidden="true">М</span><span>{compact?'MAX':'Написать в MAX'}{!compact?<small>{company.maxPhone}</small>:null}</span><span aria-hidden="true">↗</span></a>;
}
