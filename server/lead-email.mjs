import nodemailer from 'nodemailer';
import company from '../data/company.json' with {type:'json'};
let transport;
export function emailConfigured(){return Boolean(process.env.SMTP_USER&&process.env.SMTP_PASSWORD);}
export async function sendLeadEmail(payload){
 const at=new Date().toISOString();
 if(!emailConfigured())return{status:'not_configured',at};
 try{
  const port=Number(process.env.SMTP_PORT||465);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid mail configuration');
  transport??=nodemailer.createTransport({host:process.env.SMTP_HOST||'smtp.mail.ru',port,secure:port===465,requireTLS:port!==465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:10000,logger:false,debug:false});
  const text=[`Новая заявка — ${company.name}`,`Имя: ${payload.name}`,`Телефон: ${payload.phone}`,`Объект: ${payload.location||'Не указан'}`,payload.summary||`Материал: ${payload.material||'Нужен подбор'}\nПлощадь: ${payload.area||'Не указана'}`,payload.message?'Комментарий:\n'+payload.message:'',`Получена: ${payload.receivedAt||at}`].filter(Boolean).join('\n\n');
  const result=await transport.sendMail({from:{name:company.name,address:process.env.SMTP_FROM||process.env.SMTP_USER},to:company.email,subject:'Новая заявка с сайта КаменьТорг23',text,disableFileAccess:true,disableUrlAccess:true});
  return{status:result.accepted?.length?'sent':'failed',at};
 }catch{return{status:'failed',at};}
}
