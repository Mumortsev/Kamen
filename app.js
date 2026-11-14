'use strict';
const root=document.documentElement;
let pageReleased=false;
const story=document.getElementById('story');
const scene=document.getElementById('hero');
const canvas=document.getElementById('cladding');
const ctx=canvas.getContext('2d',{alpha:true});
const settledCanvas=document.getElementById('cladding-settled');
const settledCtx=settledCanvas.getContext('2d',{alpha:true});
const heroManifest=JSON.parse(document.getElementById('hero-manifest').textContent);
const header=document.getElementById('header');
const copy=document.getElementById('copy');
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const portrait=()=>innerWidth<=700||matchMedia('(max-aspect-ratio:4/5)').matches;
let mobile=portrait(),width=0,height=0,dpr=1,progress=0,target=0,frame=0,ready=false,visible=false,sceneVersion=0;
let atlas,settledImage,tiles=[],oldWidth=0,staticFull=false,lastFrameTime=0;
let geometry=null,quality=1,slowFrames=0,qualitySamples=0;
let lastReveal="",lastCue="";
const cueElement=document.getElementById("cue");
// Photographic faces, side faces and shadows are baked once at authoring time.
// A shared atlas replaces hundreds of canvases and synchronous texture generation.
function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(draw)}
function updateProgress(){schedule()}
function setupCanvases(resizeWalls=true){
 const layout=heroManifest[mobile?'mobile':'desktop'].layout;
 const scale=Math.max(width/layout.w,height/layout.h),ox=(width-layout.w*scale)/2,oy=(height-layout.h*scale)/2;
 const bounds=layout.bounds;
 const left=Math.floor(ox+bounds.x*scale)-2,top=Math.floor(oy+bounds.y*scale)-2;
 const wallWidth=Math.ceil(bounds.w*scale)+4,wallHeight=Math.ceil(bounds.h*scale)+4;
 const flightTop=Math.max(0,Math.floor(oy+(bounds.y-90)*scale));
 const flightBottom=Math.min(height,Math.ceil(oy+(bounds.y+bounds.h+420)*scale));
 const flightHeight=Math.max(1,flightBottom-flightTop);
 dpr=Math.min(devicePixelRatio||1,mobile?1:1.25)*quality;
 canvas.style.top=flightTop+'px';canvas.style.height=flightHeight+'px';
 canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(flightHeight*dpr);
 const wallDpr=Math.min(devicePixelRatio||1,2);
 settledCanvas.style.left=left+'px';settledCanvas.style.top=top+'px';
 settledCanvas.style.width=wallWidth+'px';settledCanvas.style.height=wallHeight+'px';
 if(resizeWalls){settledCanvas.width=Math.ceil(wallWidth*wallDpr);settledCanvas.height=Math.ceil(wallHeight*wallDpr)}
 geometry={scale,ox,oy,left,top,wallWidth,wallHeight,wallDpr,flightTop,flightHeight};
 if(resizeWalls){for(const tile of tiles)tile.settled=false;staticFull=false;}
 root.dataset.heroQuality=quality===1?'full':quality===.8?'balanced':'light';
}
function measure(force=false){const nextMobile=portrait();const widthChanged=Math.abs(innerWidth-oldWidth)>2;const heightChanged=!nextMobile&&Math.abs(innerHeight-height)>2;if(!force&&!widthChanged&&!heightChanged)return;oldWidth=innerWidth;width=innerWidth;
 height=Math.round(window.visualViewport?.height||innerHeight);
 root.style.setProperty('--scene-h',height+'px');root.style.setProperty('--vh',height/100+'px');
 if(nextMobile!==mobile){mobile=nextMobile;loadScene()}else setupCanvases();schedule()}
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=async()=>{try{await image.decode();resolve(image)}catch(error){reject(error)}};image.onerror=reject;image.src=url})}
async function loadScene(){const version=++sceneVersion;ready=false;root.classList.remove('ready','load-error');const name=mobile?'mobile':'desktop';try{
 const [a,wall]=await Promise.all([loadImage(`./assets/hero-${name}-atlas.webp`),loadImage(`./assets/hero-${name}-settled.webp`)]);
 let prepared=a;if(window.createImageBitmap){try{prepared=await createImageBitmap(a)}catch{ /* Decoded HTMLImageElement remains a valid fallback. */ }}
 if(version!==sceneVersion){prepared.close?.();return}atlas?.close?.();atlas=prepared;settledImage=wall;
 tiles=heroManifest[name].items.map(tile=>({...tile,settled:false}));
 quality=1;slowFrames=0;qualitySamples=0;lastFrameTime=0;setupCanvases();
 // Decode and upload the atlas before accepting the first gesture.
 ctx.drawImage(atlas,0,0);
 // Force the first canvas materialization now, rather than on a touch frame.
 ctx.getImageData(0,0,1,1);ctx.clearRect(0,0,canvas.width,canvas.height);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 if(version!==sceneVersion)return;ready=true;root.classList.add('ready');schedule();
 }catch{if(version!==sceneVersion)return;root.classList.add('load-error');document.getElementById('loader').textContent='Сцена не загрузилась. Обновите страницу.'}}
function updateUI(){
 const reveal=smooth((progress-.67)/.17).toFixed(3),cue=(1-smooth(progress/.12)).toFixed(3);
 if(reveal!==lastReveal){scene.style.setProperty('--reveal',reveal);lastReveal=reveal}
 if(cue!==lastCue){scene.style.setProperty('--cue',cue);lastCue=cue}
 const next=Number(reveal)>.015;
 if(next!==visible){visible=next;root.classList.toggle('hero-visible',visible);header.hidden=!visible;copy.hidden=!visible;document.getElementById('bottom').hidden=!visible;document.getElementById('lower').hidden=!visible;document.getElementById('lower').inert=!visible;header.inert=!visible;copy.inert=!visible;header.setAttribute('aria-hidden',String(!visible));copy.setAttribute('aria-hidden',String(!visible))}
 cueElement.style.visibility=progress>.15?'hidden':'visible';
}
function atlasDraw(context,rect,x,y){context.drawImage(atlas,rect[0],rect[1],rect[2],rect[3],x,y,rect[4],rect[5])}
function updateSettled(p){
 const {scale,ox,oy,left,top,wallWidth,wallHeight,wallDpr}=geometry;
 const layout=heroManifest[mobile?'mobile':'desktop'].layout;
 const reset=()=>{settledCtx.setTransform(wallDpr,0,0,wallDpr,0,0);settledCtx.clearRect(0,0,wallWidth,wallHeight);settledCtx.translate(ox-left,oy-top);settledCtx.scale(scale,scale)};
 if(p>=.999){if(!staticFull){reset();settledCtx.drawImage(settledImage,layout.bounds.x,layout.bounds.y);for(const tile of tiles)tile.settled=true;staticFull=true}return}
 let rebuild=staticFull;staticFull=false;const added=[];
 for(const tile of tiles){const t=clamp((p-tile.start)/.22);const placed=t>=1||(reduced&&t>0);if(tile.settled&&!placed)rebuild=true;if(placed&&!tile.settled)added.push(tile);tile.settled=placed}
 if(rebuild){reset();for(const tile of tiles)if(tile.settled)atlasDraw(settledCtx,tile.face,tile.x,tile.y)}
 else if(added.length){settledCtx.setTransform(wallDpr*scale,0,0,wallDpr*scale,(ox-left)*wallDpr,(oy-top)*wallDpr);for(const tile of added)atlasDraw(settledCtx,tile.face,tile.x,tile.y)}
}
function draw(now){
 frame=0;const elapsed=lastFrameTime?now-lastFrameTime:0;const dt=elapsed?Math.min(50,Math.max(1,elapsed)):16.67;lastFrameTime=now;
 const blend=1-Math.exp(-dt/55);progress=reduced?target:progress+(target-progress)*blend;
 if(Math.abs(target-progress)<.0001)progress=target;updateUI();
 if(ready){
 const p=clamp(progress/.62);
 // Adapt only moving fragments. The house and finished facade retain their resolution.
 if(mobile&&p>0&&p<.999&&elapsed>0){qualitySamples++;if(elapsed>25)slowFrames++;if(qualitySamples>=24){if(slowFrames>=8&&quality>.65){quality=quality===1?.8:.65;setupCanvases(false)}qualitySamples=0;slowFrames=0}}
 const {scale,ox,oy,flightTop,flightHeight}=geometry;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,flightHeight);ctx.translate(ox,oy-flightTop);ctx.scale(scale,scale);
 updateSettled(p);
 if(p>0&&p<.999&&!reduced)for(const tile of tiles){
 const t=clamp((p-tile.start)/.22);if(t<=0||t>=1)continue;
 const ease=1-Math.pow(1-t,2.4),remaining=1-ease,seating=1-smooth((t-.78)/.22);
 const x=tile.cx+tile.originX*remaining;
 const y=tile.cy+tile.originY*remaining+Math.sin(t*Math.PI)*tile.arc-3*seating;
 const size=1+remaining*.23;
 const radius=(tile.body[4]+tile.body[5])*size*.55;
 if(x+radius < -ox/scale || x-radius > (width-ox)/scale || y+radius < (flightTop-oy)/scale || y-radius > (flightTop+flightHeight-oy)/scale)continue;
 ctx.save();ctx.translate(x,y);ctx.rotate(tile.turn*remaining);ctx.scale(size*(1-.08*seating),size*(1-.13*seating));
 // One atlas draw while in flight; fade only the side faces during final seating.
 if(seating>.995)atlasDraw(ctx,tile.body,tile.x-tile.cx-tile.padding,tile.y-tile.cy-tile.padding);
 else{if(seating>.005){ctx.globalAlpha=seating;atlasDraw(ctx,tile.body,tile.x-tile.cx-tile.padding,tile.y-tile.cy-tile.padding);ctx.globalAlpha=1-seating}atlasDraw(ctx,tile.face,tile.x-tile.cx,tile.y-tile.cy);ctx.globalAlpha=1}
 ctx.restore();
 }
 }
 if(progress!==target)schedule();else lastFrameTime=0;
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;lastFrameTime=0}else schedule()});
function restart(){pageReleased=false;root.classList.remove('page-scroll','past-hero','at-estimate');window.scrollTo({top:0,behavior:'instant'});target=0;schedule()}
document.getElementById('restart').addEventListener('click',restart);document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();restart()});
const dialog=document.getElementById('contact');document.getElementById('request').addEventListener('click',()=>jumpTo('calculator'));
for(const trigger of document.querySelectorAll('[data-open]'))trigger.addEventListener('click',()=>document.getElementById(trigger.dataset.open).showModal());
for(const panel of document.querySelectorAll('dialog')){panel.querySelector('.close').addEventListener('click',()=>panel.close());panel.addEventListener('click',event=>{if(event.target!==panel)return;const b=panel.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)panel.close()})}
document.getElementById('demo-form').addEventListener('submit',event=>{event.preventDefault();document.getElementById('demo-status').hidden=false});
// Capture input while the page itself stays fixed. Dialog gestures remain native.
let touchX=0,touchY=0,touchActive=false;
function advance(delta){if(!ready||document.querySelector('dialog[open]'))return;if(target>=.999&&progress>=.98&&delta>0){unlockPage();window.scrollBy({top:Math.max(30,Math.min(delta*height,180)),behavior:'instant'});return}target=clamp(target+delta);schedule()}
scene.addEventListener('wheel',event=>{if(pageReleased||document.querySelector('dialog[open]')||event.ctrlKey)return;event.preventDefault();const unit=event.deltaMode===1?16:event.deltaMode===2?height:1;advance(event.deltaY*unit/Math.max(1,height*1.5));},{passive:false});
scene.addEventListener('touchstart',event=>{if(dialog.open||event.touches.length!==1){touchActive=false;return}touchX=event.touches[0].clientX;touchY=event.touches[0].clientY;touchActive=true},{passive:true});
scene.addEventListener('touchmove',event=>{if(!touchActive||dialog.open||event.touches.length!==1)return;const touch=event.touches[0];const deltaY=touchY-touch.clientY;const deltaX=touchX-touch.clientX;touchY=touch.clientY;touchX=touch.clientX;if(Math.abs(deltaY)>=Math.abs(deltaX)){event.preventDefault();if(pageReleased)window.scrollBy({top:deltaY,behavior:'instant'});else advance(deltaY/Math.max(1,height*.95))}},{passive:false});
scene.addEventListener('touchend',()=>{touchActive=false},{passive:true});scene.addEventListener('touchcancel',()=>{touchActive=false},{passive:true});
addEventListener('keydown',event=>{if(pageReleased||document.querySelector('dialog[open]')||event.target.closest('a,button,input,textarea,select'))return;const amounts={ArrowDown:.055,ArrowUp:-.055,PageDown:.25,PageUp:-.25,' ':.22};if(event.key==='Home'){event.preventDefault();restart()}else if(event.key==='End'){event.preventDefault();target=1;schedule()}else if(event.key in amounts){event.preventDefault();advance(amounts[event.key])}});
addEventListener('resize',()=>measure(),{passive:true});addEventListener('orientationchange',()=>setTimeout(()=>measure(true),300));measure(true);loadScene();

// Conversion path: task → shortlist → details → a transparent demo request.
const estimateForm=document.getElementById('estimate-form');
const materialSelect=document.getElementById('estimate-material');
const taskNames={facade:'Фасад',plinth:'Цоколь',paving:'Мощение',landscape:'Ландшафт'};
function unlockPage(){if(pageReleased)return;pageReleased=true;root.classList.add('page-scroll');syncPagePosition()}
function syncPagePosition(){root.classList.toggle('past-hero',pageReleased&&scrollY>height*.55)}
function jumpTo(id){const section=document.getElementById(id==='estimate'&&mobile?'estimate-form':id);if(!section)return;target=1;progress=1;schedule();unlockPage();requestAnimationFrame(()=>{const far=Math.abs(section.getBoundingClientRect().top)>height*1.5;section.scrollIntoView({behavior:reduced||far?'instant':'smooth',block:'start'})})}
function summarizeEstimate(){const data=new FormData(estimateForm);const parts=[taskNames[data.get('task')]||'Подбор'];const material=data.get('material');parts.push(material==='Нужна помощь с выбором'?'помощь с выбором':material);if(data.get('area'))parts.push(data.get('area')+' м²');if(data.get('location'))parts.push(data.get('location'));if(data.has('delivery'))parts.push('доставка');if(data.has('installation'))parts.push('монтаж');document.getElementById('estimate-summary').textContent=parts.join(' · ');window.syncFakturaCalculator?.({task:data.get('task'),material:data.get('material'),area:data.get('area'),delivery:data.has('delivery'),installation:data.has('installation')});return parts.join(' · ')}
function chooseTask(task){const radio=estimateForm.querySelector(`input[name="task"][value="${task}"]`);if(radio)radio.checked=true;summarizeEstimate()}
function filterMaterials(task){for(const button of document.querySelectorAll('[data-filter]')){const selected=button.dataset.filter===task;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected))}let count=0;for(const card of document.querySelectorAll('.product-card')){const match=task==='all'||card.dataset.uses.split(' ').includes(task);card.hidden=!match;if(match)count++}document.getElementById('filter-context').textContent=task==='all'?'Найдите подходящую фактуру или оставьте подбор специалисту.':`${taskNames[task]}: ${count} ${count===1?'вариант':'варианта'} для начала подбора. Применение уточним по вашему объекту.`}
for(const button of document.querySelectorAll('[data-jump]'))button.addEventListener('click',()=>jumpTo(button.dataset.jump));
for(const button of document.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{filterMaterials(button.dataset.filter);if(button.dataset.filter!=='all')chooseTask(button.dataset.filter)});
for(const button of document.querySelectorAll('[data-select-use]'))button.addEventListener('click',()=>{const use=button.dataset.selectUse;chooseTask(use);filterMaterials(use);jumpTo(button.closest('.inspiration')?'calculator':'materials')});
for(const button of document.querySelectorAll('[data-select-material]'))button.addEventListener('click',()=>{materialSelect.value=button.dataset.selectMaterial;if(materialSelect.value==='Галька и декоративный щебень')chooseTask('landscape');summarizeEstimate();jumpTo('calculator')});
for(const link of document.querySelectorAll('[data-back-top]'))link.addEventListener('click',event=>{event.preventDefault();target=1;progress=1;schedule();unlockPage();window.scrollTo({top:0,behavior:reduced?'instant':'smooth'})});
estimateForm.addEventListener('input',()=>{summarizeEstimate();document.getElementById('estimate-result').hidden=true});
estimateForm.addEventListener('change',summarizeEstimate);
estimateForm.addEventListener('submit',event=>{event.preventDefault();const result=document.getElementById('estimate-result');document.getElementById('estimate-result-details').textContent=summarizeEstimate();result.hidden=false;result.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'})});
document.getElementById('edit-estimate').addEventListener('click',()=>{document.getElementById('estimate-result').hidden=true;materialSelect.focus()});
addEventListener('scroll',syncPagePosition,{passive:true});
const estimateObserver=new IntersectionObserver(entries=>{for(const entry of entries)root.classList.toggle('at-estimate',entry.isIntersecting)},{rootMargin:'-10% 0px -20% 0px'});estimateObserver.observe(document.getElementById('estimate'));
summarizeEstimate();

// Instant, source-labelled budget calculator. No personal details are needed to see the price.
const calculatorPricing=JSON.parse(document.getElementById('pricing-data').textContent);
const calcElements={material:document.getElementById('calc-material'),area:document.getElementById('calc-area'),range:document.getElementById('calc-area-range'),reserve:document.getElementById('calc-reserve'),thickness:document.getElementById('calc-thickness'),depth:document.getElementById('calc-depth'),installation:document.getElementById('calc-install'),delivery:document.getElementById('calc-delivery'),distance:document.getElementById('calc-distance'),customPrice:document.getElementById('calc-custom-price')};
const calcMoney=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0});const calcDecimal=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1});
const calcRate=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});let calculatorApplying=false,calculatorSelectionKey="";
let calculatorTask='facade',latestBudget=null;const calcSavedAlias={'Песчаник':'yellow','Серо-зеленый плитняк':'gray','Кварцито-песчаник':'quartz','Галька и декоративный щебень':'crumb'};
Object.assign(calcSavedAlias,Object.fromEntries(calculatorPricing.materials.map(item=>[item.name,item.id])));
for(const item of calculatorPricing.materials)if(![...materialSelect.options].some(option=>option.value===item.name)){const option=document.createElement('option');option.value=item.name;option.textContent=item.name;materialSelect.append(option)}
function calculatorMaterials(preferred){const options=calculatorPricing.materials.filter(item=>item.uses.includes(calculatorTask));calcElements.material.replaceChildren(...options.map(item=>{const option=document.createElement('option');option.value=item.id;option.textContent=item.name;return option}));calcElements.material.value=options.some(item=>item.id===preferred)?preferred:options[0].id}
function setCalculatorTask(task,preferred){calculatorTask=task;for(const button of document.querySelectorAll('[data-calc-task]')){const active=button.dataset.calcTask===task;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active))}const selected=preferred||calcElements.material.value;calculatorMaterials(selected);calcElements.thickness.value=task==='paving'?'40':'20';calcElements.customPrice.value='';renderCalculator()}
function readCalculator(){return{task:calculatorTask,materialId:calcElements.material.value,area:calcElements.area.value,reserve:calcElements.reserve.value,thickness:calcElements.thickness.value,depth:calcElements.depth.value,installation:calcElements.installation.checked,delivery:calcElements.delivery.checked,distance:calcElements.distance.value,customPrice:calcElements.customPrice.value}}
function calcText(id,text){document.getElementById(id).textContent=text}
function calculatorShareText(budget){if(!budget?.valid)return'';return['ФАКТУРА 23 — предварительный расчет',`${taskNames[budget.task]} · ${budget.material.name}`,`Чистая площадь: ${calcDecimal.format(budget.area)} м²; запас ${budget.reserve}%.`,budget.material.unit==='kg'?`К заказу: ${calcDecimal.format(budget.quantity)} кг (${budget.bags} меш. × 25 кг), слой ${budget.depth} см.`:`К заказу: ${calcDecimal.format(budget.quantity)} м², толщина ${budget.thickness} мм.`,`Материал: ${calcMoney.format(budget.materialCost)} ₽.`,`Работы: ${budget.installation?calcMoney.format(budget.installationCost)+' ₽':'не выбраны'}.`,`Доставка: ${budget.delivery?calcMoney.format(budget.deliveryCost)+' ₽':'самовывоз'}.`,`Итого ориентировочно: ${calcMoney.format(budget.total)} ₽.`,`Цены и допущения сверены ${calculatorPricing.checkedAt}. Не оферта; подготовка основания, расходники и леса не включены.`].join('\n')}
function renderCalculator(){
 const input=readCalculator(),material=calculatorPricing.materials.find(item=>item.id===input.materialId),bulk=material.unit==='kg';
 document.getElementById('calc-thickness-field').hidden=bulk;document.getElementById('calc-depth-field').hidden=!bulk;document.getElementById('calc-distance-field').hidden=!input.delivery;
 calcText('calc-custom-unit',bulk?'за кг':'за м²');calcText('calc-rate',`от ${calcMoney.format(material.rate)} ₽/${bulk?'кг':'м²'}`);calcText('calc-price-kind',material.type==='catalog'?'База из каталога':'Рыночная оценка');
 document.getElementById('calc-swatch').className=`calc-swatch texture-${material.texture}`;document.getElementById('calc-result-texture').className=`calc-result-texture texture-${material.texture}`;document.getElementById('calc-material-source').href=material.source;
 calcText('calc-rate-note',material.note);calcText('calc-install-title',bulk?'Распределение отсыпки':'Монтаж');calcText('calc-install-caption',`${bulk?'Без подготовки участка':'На готовое основание'} · ориентир ${calcMoney.format(calculatorPricing.installation[calculatorTask])} ₽/м²`);
 calcText('calc-volume-note',bulk?'Количество округляется вверх до мешков по 25 кг. Плотность 1 600 кг/м³ — расчетное допущение.':'Поправки цены по толщине — ориентировочные. Можно указать свою цену от поставщика.');
 const numericArea=Number(input.area);calcElements.range.value=String(clamp(numericArea||1,1,250));calcElements.range.style.setProperty('--range-fill',`${clamp(((numericArea||1)-1)/249)*100}%`);
 for(const button of document.querySelectorAll('[data-calc-area]'))button.classList.toggle('selected',Number(button.dataset.calcArea)===numericArea);
 latestBudget=calculateStoneBudget(input,calculatorPricing);const budget=latestBudget;const error=document.getElementById('calc-error');error.hidden=budget.valid;document.getElementById('calc-request').disabled=!budget.valid;document.getElementById('calc-copy').disabled=!budget.valid;
 calcText('calc-result-title',`${material.name} · ${taskNames[calculatorTask].toLocaleLowerCase('ru-RU')}`);
 if(!budget.valid){calcText('calc-total-mobile','Уточните параметры');calcText('calc-error',budget.errors[0]);for(const id of ['calc-total','calc-material-cost','calc-install-cost','calc-delivery-cost','calc-weight'])calcText(id,'—');for(const id of ['calc-material-formula','calc-install-formula','calc-delivery-formula','calc-quantity','calc-warning'])calcText(id,'');return}
 document.querySelector('.calc-total').classList.toggle('long',calcMoney.format(budget.total).length>=10);document.querySelector('.calc-total').classList.toggle('very-long',calcMoney.format(budget.total).length>=13);calcText('calc-total',calcMoney.format(budget.total));calcText('calc-total-mobile','≈ '+calcMoney.format(budget.total)+' ₽');calcText('calc-material-cost',calcMoney.format(budget.materialCost)+' ₽');calcText('calc-material-formula',`${calcDecimal.format(budget.quantity)} ${bulk?'кг':'м²'} × ${calcRate.format(budget.rate)} ₽`);
 calcText('calc-install-cost',budget.installation?calcMoney.format(budget.installationCost)+' ₽':'Не выбран');calcText('calc-install-formula',budget.installation?`${calcDecimal.format(budget.area)} м² × ${calcMoney.format(budget.installationRate)} ₽ · без запаса`:'Можно добавить в настройках');
 calcText('calc-delivery-cost',budget.delivery?calcMoney.format(budget.deliveryCost)+' ₽':'Самовывоз');calcText('calc-delivery-formula',budget.delivery?`${budget.trips} рейс${budget.trips===1?'':budget.trips<5?'а':'ов'} · до ${budget.vehicle.capacityKg/1000} т${budget.distance?' · '+budget.distance+' км за городом':''}`:'Логистика не включена');
 calcText('calc-quantity',bulk?`К заказу: ${calcDecimal.format(budget.quantity)} кг · ${budget.bags} меш. по 25 кг`:`К заказу: ${calcDecimal.format(budget.quantity)} м² · запас ${budget.reserve}%`);calcText('calc-weight',budget.massKg>=1000?calcDecimal.format(budget.massKg/1000)+' т':calcMoney.format(budget.massKg)+' кг');
 const warnings=[];if(material.type==='estimate')warnings.push('Цена материала — рыночный ориентир.');if(material.type==='catalog'&&!budget.hasCustom)warnings.push('Условия розницы и выбранной партии нужно подтвердить.');if(!bulk&&budget.factor!==1)warnings.push(`Цена скорректирована по толщине: коэффициент ${calcDecimal.format(budget.factor)} — допущение.`);if(bulk&&budget.quantity<1000)warnings.push('В исходном каталоге указан опт от 1 т; цена для меньшего объема уточняется.');if(budget.hasCustom)warnings.push('Использована ваша цена за единицу.');calcText('calc-warning',warnings.join(' '));
}
for(const button of document.querySelectorAll('[data-calc-task]'))button.addEventListener('click',()=>setCalculatorTask(button.dataset.calcTask));
for(const button of document.querySelectorAll('[data-calc-area]'))button.addEventListener('click',()=>{calcElements.area.value=button.dataset.calcArea;renderCalculator()});
calcElements.range.addEventListener('input',()=>{calcElements.area.value=calcElements.range.value;renderCalculator()});
for(const element of Object.values(calcElements))if(element!==calcElements.range&&element!==calcElements.material)element.addEventListener('input',renderCalculator);
calcElements.material.addEventListener('change',()=>{calcElements.customPrice.value='';renderCalculator()});
window.syncFakturaCalculator=selection=>{
 if(calculatorApplying)return;const key=JSON.stringify(selection);if(key===calculatorSelectionKey)return;calculatorSelectionKey=key;
 if(Number(selection.area)>0)calcElements.area.value=selection.area;calcElements.delivery.checked=selection.delivery;calcElements.installation.checked=selection.installation;
 const preferred=calcSavedAlias[selection.material];
 if(selection.task!==calculatorTask){setCalculatorTask(selection.task,preferred);return}
 if(preferred&&preferred!==calcElements.material.value&&calculatorPricing.materials.some(item=>item.id===preferred&&item.uses.includes(calculatorTask))){calcElements.material.value=preferred;calcElements.customPrice.value=''}
 renderCalculator();
};
document.getElementById('calc-request').addEventListener('click',()=>{const budget=latestBudget;if(!budget?.valid)return;calculatorApplying=true;chooseTask(budget.task);materialSelect.value=budget.material.name;estimateForm.elements.area.value=budget.area;estimateForm.elements.delivery.checked=budget.delivery;estimateForm.elements.installation.checked=budget.installation;const snapshot=calculatorShareText(budget);const saved=document.getElementById('estimate-budget');saved.textContent=snapshot;saved.hidden=false;summarizeEstimate();calculatorApplying=false;{const data=new FormData(estimateForm);calculatorSelectionKey=JSON.stringify({task:data.get('task'),material:data.get('material'),area:data.get('area'),delivery:data.has('delivery'),installation:data.has('installation')})}jumpTo('estimate')});
document.getElementById('calc-copy').addEventListener('click',async()=>{const text=calculatorShareText(latestBudget);if(!text)return;try{await navigator.clipboard.writeText(text);calcText('calc-copy','Расчет скопирован ✓')}catch{const panel=document.getElementById('calc-copy-fallback');panel.value=text;panel.hidden=false;panel.focus();panel.select();calcText('calc-copy','Расчет готов — выделен для копирования')}setTimeout(()=>{document.getElementById('calc-copy').innerHTML='Скопировать расчет <span>↗</span>'},2500)});
calculatorMaterials('gray');renderCalculator();

estimateForm.addEventListener('input',event=>{if(['task','material','area','delivery','installation','location'].includes(event.target.name))document.getElementById('estimate-budget').hidden=true});
const calculatorObserver=new IntersectionObserver(entries=>{for(const entry of entries)root.classList.toggle('at-calculator',entry.isIntersecting)},{rootMargin:'-15% 0px -20% 0px'});calculatorObserver.observe(document.getElementById('calculator'));
const calculatorResultObserver=new IntersectionObserver(entries=>{for(const entry of entries)root.classList.toggle('calc-result-visible',entry.isIntersecting)},{threshold:.1});calculatorResultObserver.observe(document.getElementById('calc-result'));

const calculatorDeepLink=location.hash.slice(1);if(["calculator","estimate","materials","service"].includes(calculatorDeepLink))requestAnimationFrame(()=>jumpTo(calculatorDeepLink));

const mediaObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.dataset.mediaReady='true';mediaObserver.unobserve(entry.target)}},{rootMargin:'300px'});
for(const element of document.querySelectorAll('.application-image,.product-texture,.calc-swatch,.calc-result-texture'))mediaObserver.observe(element);
