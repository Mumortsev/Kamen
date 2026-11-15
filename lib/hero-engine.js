export function startHero({manifest,assetUrl,onFinish,onCalculate}) {
const controller=new AbortController();let orientationTimer;
const listen=(el,event,handler,options={})=>el?.addEventListener(event,handler,{...options,signal:controller.signal});
const root=document.documentElement;
let introTravel=1;
const story=document.getElementById('story');
const scene=document.getElementById('hero');
const canvas=document.getElementById('cladding');
const ctx=canvas.getContext('2d',{alpha:true});
const settledCanvas=document.getElementById('cladding-settled');
const settledCtx=settledCanvas.getContext('2d',{alpha:true});
const heroManifest=manifest;
const header=document.getElementById('header');
const copy=document.getElementById('copy');
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const portrait=()=>innerWidth<=700||matchMedia('(max-aspect-ratio:4/5)').matches;
let mobile=portrait(),width=0,height=0,dpr=1,progress=0,target=0,frame=0,ready=false,visible=false,sceneVersion=0;
let atlas,settledImage,tiles=[],oldWidth=0,staticFull=false,lastFrameTime=0;
let geometry=null,quality=1,slowFrames=0,qualitySamples=0;
let lastReveal="",lastCue="",lastFinish=-1;
let heroFinish='sand',heroPreference='';
const heroFinishes={sand:{label:'Песочный',name:'Тёплый песчаник'},light:{label:'Светлый',name:'Светлый известняк'},graphite:{label:'Графитовый',name:'Графитовый сланец'}};
const finishPicker=document.getElementById('hero-finishes');
function rememberHeroFinish(){onFinish(heroFinishes[heroFinish].name)}
function prepareTrajectories(items){
 const low=Math.max(...items.map(tile=>tile.cy)),high=Math.min(...items.map(tile=>tile.cy));
 const starts=items.map((tile,i)=>{const row=(low-tile.cy)/(low-high);return Math.floor(row*5)/5*.66+row*.035+(i%9)*.002});
 const first=Math.min(...starts);
 return items.map((tile,i)=>({...tile,settled:false,start:Math.max(0,starts[i]-first-.012),originX:Math.sign(tile.originX)*((mobile?155:205)+(i%7)*13),originY:65+(i%5)*12,turn:tile.turn*.22,arc:tile.arc*.18}));
}
const cueElement=document.getElementById("cue");
// Photographic faces, side faces and shadows are baked once at authoring time.
// A shared atlas replaces hundreds of canvases and synchronous texture generation.
function schedule(){if(!frame&&!document.hidden&&!controller.signal.aborted)frame=requestAnimationFrame(draw)}
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
 introTravel=Math.round(height*(nextMobile?1.45:1.55));root.style.setProperty('--intro-travel',introTravel+'px');syncPagePosition();
 if(nextMobile!==mobile){mobile=nextMobile;loadScene()}else setupCanvases();schedule()}
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=async()=>{try{await image.decode();resolve(image)}catch(error){reject(error)}};image.onerror=reject;image.src=url})}
async function loadScene(finish=heroFinish,preserve=false){
 const version=++sceneVersion;if(!preserve){ready=false;root.classList.remove('ready','load-error')}
 finishPicker.setAttribute('aria-busy','true');const name=mobile?'mobile':'desktop',suffix=finish==='sand'?'':'-'+finish;
 try{
 const [image,wall]=await Promise.all([loadImage(assetUrl(`hero-${name}${suffix}-atlas.webp`)),loadImage(assetUrl(`hero-${name}${suffix}-settled.webp`))]);
 let prepared=image;if(window.createImageBitmap){try{prepared=await createImageBitmap(image)}catch{}}
 // Warm a detached surface so a finish change never flashes the sprite sheet.
 const warm=document.createElement('canvas');warm.width=64;warm.height=64;
 const warmContext=warm.getContext('2d');warmContext.drawImage(prepared,0,0,64,64);warmContext.getImageData(0,0,1,1);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 if(version!==sceneVersion||controller.signal.aborted){prepared.close?.();return}
 atlas?.close?.();atlas=prepared;settledImage=wall;
 tiles=prepareTrajectories(heroManifest[name].items);lastFinish=-1;
 if(!preserve){quality=1;slowFrames=0;qualitySamples=0}lastFrameTime=0;setupCanvases();
 heroFinish=finish;for(const button of finishPicker.querySelectorAll('[data-finish]'))button.setAttribute('aria-pressed',String(button.dataset.finish===finish));
 document.getElementById('finish-name').textContent=heroFinishes[finish].name;document.getElementById('finish-status').textContent='';finishPicker.setAttribute('aria-busy','false');
 ready=true;root.classList.add('ready');if(preserve)rememberHeroFinish();schedule();
 }catch{if(version!==sceneVersion||controller.signal.aborted)return;finishPicker.setAttribute('aria-busy','false');if(preserve){document.getElementById('finish-status').textContent='Не удалось загрузить отделку. Попробуйте ещё раз.'}else{root.classList.add('load-error');document.getElementById('loader').textContent='Сцена не загрузилась. Обновите страницу.'}}
}
function updateUI(){
 const reveal=smooth((progress-.74)/.13).toFixed(3),cue=(1-smooth(progress/.12)).toFixed(3);
 if(reveal!==lastReveal){scene.style.setProperty('--reveal',reveal);lastReveal=reveal}
 if(cue!==lastCue){scene.style.setProperty('--cue',cue);lastCue=cue}
 const next=Number(reveal)>.015;
 if(next!==visible){visible=next;root.classList.toggle('hero-visible',visible);header.hidden=!visible;copy.hidden=!visible;document.getElementById('bottom').hidden=!visible;finishPicker.hidden=!visible;finishPicker.inert=!visible;document.getElementById('lower').hidden=!visible;document.getElementById('lower').inert=!visible;header.inert=!visible;copy.inert=!visible;header.setAttribute('aria-hidden',String(!visible));copy.setAttribute('aria-hidden',String(!visible))}
 cueElement.style.visibility=progress>.15?'hidden':'visible';
}
function atlasDraw(context,rect,x,y){context.drawImage(atlas,rect[0],rect[1],rect[2],rect[3],x,y,rect[4],rect[5])}
function updateSettled(p){
 const {scale,ox,oy,left,top,wallWidth,wallHeight,wallDpr}=geometry;
 const layout=heroManifest[mobile?'mobile':'desktop'].layout;
 const reset=()=>{settledCtx.setTransform(wallDpr,0,0,wallDpr,0,0);settledCtx.clearRect(0,0,wallWidth,wallHeight);settledCtx.translate(ox-left,oy-top);settledCtx.scale(scale,scale)};
 if(p>=.999){const finish=Math.round(smooth((progress-.64)/.075)*12);if(!staticFull||finish!==lastFinish){reset();settledCtx.drawImage(settledImage,layout.bounds.x,layout.bounds.y);if(finish){settledCtx.globalCompositeOperation='source-atop';settledCtx.fillStyle=`rgba(255,204,133,${finish/12*.055})`;settledCtx.fillRect(layout.bounds.x,layout.bounds.y,layout.bounds.w,layout.bounds.h);settledCtx.globalCompositeOperation='source-over'}for(const tile of tiles)tile.settled=true;staticFull=true;lastFinish=finish}return}
 let rebuild=staticFull;staticFull=false;const added=[];
 for(const tile of tiles){const t=clamp((p-tile.start)/.16);const placed=t>=1||(reduced&&t>0);if(tile.settled&&!placed)rebuild=true;if(placed&&!tile.settled)added.push(tile);tile.settled=placed}
 if(rebuild){reset();for(const tile of tiles)if(tile.settled)atlasDraw(settledCtx,tile.face,tile.x,tile.y)}
 else if(added.length){settledCtx.setTransform(wallDpr*scale,0,0,wallDpr*scale,(ox-left)*wallDpr,(oy-top)*wallDpr);for(const tile of added)atlasDraw(settledCtx,tile.face,tile.x,tile.y)}
}
function draw(now){
 frame=0;const elapsed=lastFrameTime?now-lastFrameTime:0;const dt=elapsed?Math.min(50,Math.max(1,elapsed)):16.67;lastFrameTime=now;
 const blend=1-Math.exp(-dt/55);progress=reduced?target:progress+(target-progress)*blend;
 if(Math.abs(target-progress)<.0001)progress=target;updateUI();
 if(ready){
 const p=clamp(progress/.64);
 // Adapt only moving fragments. The house and finished facade retain their resolution.
 if(mobile&&p>0&&p<.999&&elapsed>0){qualitySamples++;if(elapsed>25)slowFrames++;if(qualitySamples>=24){if(slowFrames>=8&&quality>.65){quality=quality===1?.8:.65;setupCanvases(false)}qualitySamples=0;slowFrames=0}}
 const {scale,ox,oy,flightTop,flightHeight}=geometry;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,flightHeight);ctx.translate(ox,oy-flightTop);ctx.scale(scale,scale);
 updateSettled(p);
 if(p>0&&p<.999&&!reduced)for(const tile of tiles){
 const t=clamp((p-tile.start)/.16);if(t<=0||t>=1)continue;
 const ease=1-Math.pow(1-t,3),remaining=1-ease,seating=1-smooth((t-.78)/.22);
 const x=tile.cx+tile.originX*remaining;
 const y=tile.cy+tile.originY*remaining+Math.sin(t*Math.PI)*tile.arc-3*seating;
 const size=1+remaining*.08;
 const radius=(tile.body[4]+tile.body[5])*size*.55;
 if(x+radius < -ox/scale || x-radius > (width-ox)/scale || y+radius < (flightTop-oy)/scale || y-radius > (flightTop+flightHeight-oy)/scale)continue;
 ctx.save();ctx.translate(x,y);ctx.rotate(tile.turn*remaining);ctx.scale(size*(1-.035*seating),size*(1-.065*seating));
 // One atlas draw while in flight; fade only the side faces during final seating.
 if(seating>.995)atlasDraw(ctx,tile.body,tile.x-tile.cx-tile.padding,tile.y-tile.cy-tile.padding);
 else{if(seating>.005){ctx.globalAlpha=seating;atlasDraw(ctx,tile.body,tile.x-tile.cx-tile.padding,tile.y-tile.cy-tile.padding);ctx.globalAlpha=1-seating}atlasDraw(ctx,tile.face,tile.x-tile.cx,tile.y-tile.cy);ctx.globalAlpha=1}
 ctx.restore();
 }
 }
 if(progress!==target)schedule();else lastFrameTime=0;
}
listen(document,'visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;lastFrameTime=0}else schedule()});
function restart(){window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});syncPagePosition()}
listen(document.getElementById('restart'),'click',restart);
listen(document.querySelector('.brand'),'click',event=>{event.preventDefault();restart()});
listen(document.getElementById('request'),'click',()=>{rememberHeroFinish();onCalculate();document.getElementById('calculator')?.scrollIntoView({behavior:reduced?'instant':'smooth'})});
for(const button of finishPicker.querySelectorAll('[data-finish]'))listen(button,'click',()=>{if(button.dataset.finish!==heroFinish||finishPicker.getAttribute('aria-busy')==='true')loadScene(button.dataset.finish,true)});
function syncPagePosition(){root.classList.toggle('past-hero',scrollY>introTravel+height*.55);const next=clamp(scrollY/Math.max(1,introTravel*.76));if(next!==target){target=next;schedule()}}
root.classList.add('page-scroll');
listen(window,'resize',()=>measure(),{passive:true});
listen(window,'orientationchange',()=>{clearTimeout(orientationTimer);orientationTimer=setTimeout(()=>{if(!controller.signal.aborted)measure(true)},300)});
listen(window,'scroll',syncPagePosition,{passive:true});
measure(true);loadScene();syncPagePosition();
return ()=>{controller.abort();sceneVersion++;clearTimeout(orientationTimer);cancelAnimationFrame(frame);atlas?.close?.();root.classList.remove('ready','load-error','hero-visible','past-hero','page-scroll');};
}
