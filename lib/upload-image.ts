import {basePath} from './paths';
export async function uploadSitePhoto(file:File,csrf:string){
 if(file.size>10*1024*1024)throw Error('Фото должно быть не больше 10 МБ.');
 const bitmap=await createImageBitmap(file);
 if(bitmap.width*bitmap.height>25000000){bitmap.close();throw Error('Максимум — 25 мегапикселей.');}
 const canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
 canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
 const context=canvas.getContext('2d');if(!context){bitmap.close();throw Error('Не удалось обработать фото.');}
 context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.85));
 if(!blob||blob.size>3500000)throw Error('Выберите фотографию меньшего размера.');
 const response=await fetch(basePath+'/api/admin/media',{method:'POST',headers:{'Content-Type':'image/webp','X-CSRF-Token':csrf},body:blob});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Не удалось загрузить фотографию.');
 return{src:result.src as string,alt:file.name.replace(/\.[^.]+$/,''),source:''};
}
