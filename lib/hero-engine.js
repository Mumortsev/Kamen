import { pathNames, positionPath, revealPath } from './hero-path.js';

export function startHero({manifest,assetUrl,onFinish,onError,onReady}) {
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
if(!ctx||!settledCtx)throw Error('Canvas is unavailable');
const heroManifest=manifest;
const facadeEnd = .61;
const pathStart = .63;
const pathEnd = .87;
const pathLayer = document.getElementById('hero-path');
const pathPicker = document.getElementById('path-options');
const pathButtons = pathPicker.querySelectorAll('[data-path-finish]');
const pathStatus = document.getElementById('path-status');
let pathFinish = 'honey', pathFormat = '', pathVersion = 0, lastPathAmount = -1;
const pathImages = new Map();
const header=document.getElementById('header');
const copy=document.getElementById('copy');
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const portrait=()=>innerWidth<=700||matchMedia('(max-aspect-ratio:4/5)').matches;
let mobile=portrait(),width=0,height=0,dpr=1,progress=0,target=0,frame=0,ready=false,visible=false,sceneVersion=0;
let atlas,settledImage,tiles=[],oldWidth=0,staticFull=false,lastFrameTime=0;
let geometry=null,quality=1,slowFrames=0,qualitySamples=0,flightDrawn=false;
let lastReveal="",lastCue="",lastFinish=-1,failed=false;
let heroFinish='sand';
const heroFinishes={sand:{label:'Песочный',name:'Тёплый песчаник'},light:{label:'Светлый',name:'Светлый известняк'},graphite:{label:'Графитовый',name:'Графитовый сланец'}};
const finishPicker=document.getElementById('hero-finishes');
const facadePicker=document.getElementById('facade-options');
function rememberHeroFinish(){
 const facade = heroFinishes[heroFinish].name;
 onFinish?.(pathFormat ? `Фасад: ${facade}. Дорожка: ${pathNames[pathFinish]}` : facade);
}
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
 canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(flightHeight*dpr);flightDrawn=false;
 const wallDpr=Math.min(devicePixelRatio||1,2);
 settledCanvas.style.left=left+'px';settledCanvas.style.top=top+'px';
 settledCanvas.style.width=wallWidth+'px';settledCanvas.style.height=wallHeight+'px';
 if(resizeWalls){settledCanvas.width=Math.ceil(wallWidth*wallDpr);settledCanvas.height=Math.ceil(wallHeight*wallDpr)}
 geometry={scale,ox,oy,left,top,wallWidth,wallHeight,wallDpr,flightTop,flightHeight};
 positionPath(pathLayer,mobile?'mobile':'desktop',layout,geometry);
 if(resizeWalls){for(const tile of tiles)tile.settled=false;staticFull=false;}
 root.dataset.heroQuality=quality===1?'full':quality===.8?'balanced':'light';
}
function measure(force=false){const nextMobile=portrait();const widthChanged=Math.abs(innerWidth-oldWidth)>2;const heightChanged=!nextMobile&&Math.abs(innerHeight-height)>2;if(!force&&!widthChanged&&!heightChanged)return;oldWidth=innerWidth;width=innerWidth;
 // Mobile browser chrome changes visualViewport.height during a swipe.
 // Size the scene once to the stable large viewport, never to its moving toolbar.
 const viewport=document.createElement('div');
 viewport.style.cssText='position:fixed;visibility:hidden;pointer-events:none;width:0;height:100lvh';
 document.body.append(viewport);
 height=Math.round(Math.max(innerHeight,viewport.getBoundingClientRect().height));viewport.remove();
 root.style.setProperty('--scene-h',height+'px');root.style.setProperty('--vh',height/100+'px');
 introTravel=reduced?0:Math.round(height*(nextMobile?1.68:1.72));root.style.setProperty('--intro-travel',introTravel+'px');syncPagePosition();
 if(nextMobile!==mobile){
  mobile=nextMobile;pathFormat='';revealPath(pathLayer,0);setupCanvases();loadScene();
 }else setupCanvases();
 schedule()
}
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=async()=>{try{await image.decode();resolve(image)}catch(error){reject(error)}};image.onerror=reject;image.src=url})}
async function loadPath(finish=pathFinish, notify=false) {
 const version=++pathVersion, format=mobile?'mobile':'desktop';
 const url=assetUrl(`hero-path-${format}-${finish}.webp`);
 pathPicker.setAttribute('aria-busy','true');
 pathStatus.textContent='';
 try {
  if(!pathImages.has(url)){
   pathImages.set(url,loadImage(url).catch(error=>{pathImages.delete(url);throw error;}));
  }
  await pathImages.get(url);
  if(version!==pathVersion||controller.signal.aborted)return;
  pathLayer.style.backgroundImage=`url("${url}")`;
  pathFormat=format;pathFinish=finish;lastPathAmount=-1;
  for(const button of pathButtons)button.setAttribute('aria-pressed',String(button.dataset.pathFinish===finish));
  document.getElementById('path-name').textContent=pathNames[finish];
  if(notify)rememberHeroFinish();
  schedule();
 }catch{
  if(version===pathVersion&&!controller.signal.aborted)pathStatus.textContent='Не удалось загрузить отсыпку. Выберите цвет ещё раз.';
 }finally{
  if(version===pathVersion&&!controller.signal.aborted)pathPicker.setAttribute('aria-busy','false');
 }
}

function updatePath(){
 const amount=ready&&pathFormat===(mobile?'mobile':'desktop')?smooth((progress-pathStart)/(pathEnd-pathStart)):0;
 if(amount!==lastPathAmount){revealPath(pathLayer,amount);lastPathAmount=amount;}
}

async function loadScene(finish=heroFinish,preserve=false){
 const version=++sceneVersion;let candidate=null;if(!preserve){failed=false;ready=false;root.classList.remove('ready','load-error')}
 facadePicker.setAttribute('aria-busy','true');const name=mobile?'mobile':'desktop',suffix=finish==='sand'?'':'-'+finish;
 try{
 const pathReady=preserve?Promise.resolve():loadPath();
 const [image,wall]=await Promise.all([loadImage(assetUrl(`hero-${name}${suffix}-atlas.webp`)),loadImage(assetUrl(`hero-${name}${suffix}-settled.webp`)),pathReady]);
 candidate=image;if(window.createImageBitmap){try{candidate=await createImageBitmap(image)}catch{}}
 // Warm a detached surface so a finish change never flashes the sprite sheet.
 const warm=document.createElement('canvas');warm.width=64;warm.height=64;
 const warmContext=warm.getContext('2d');warmContext.drawImage(candidate,0,0,64,64);warmContext.getImageData(0,0,1,1);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 if(version!==sceneVersion||controller.signal.aborted){candidate.close?.();return}
 atlas?.close?.();atlas=candidate;candidate=null;settledImage=wall;
 tiles=prepareTrajectories(heroManifest[name].items);lastFinish=-1;
 if(!preserve){quality=1;slowFrames=0;qualitySamples=0}lastFrameTime=0;setupCanvases();
 heroFinish=finish;for(const button of finishPicker.querySelectorAll('[data-finish]'))button.setAttribute('aria-pressed',String(button.dataset.finish===finish));
 document.getElementById('finish-name').textContent=heroFinishes[finish].name;document.getElementById('finish-status').textContent='';facadePicker.setAttribute('aria-busy','false');finishPicker.hidden=!visible;finishPicker.inert=!visible;
 ready=true;root.classList.add('ready');onReady?.();if(preserve)rememberHeroFinish();schedule();
 }catch{candidate?.close?.();if(version!==sceneVersion||controller.signal.aborted)return;facadePicker.setAttribute('aria-busy','false');if(preserve){document.getElementById('finish-status').textContent='Не удалось загрузить отделку. Попробуйте ещё раз.'}else{failed=true;onError?.();schedule()}}
}
function updateUI(){
 const reveal=failed?'1.000':(ready?smooth((progress-pathEnd)/.115):0).toFixed(3);
 const cue=failed||reduced?'0.000':(1-smooth(progress/.075)).toFixed(3);
 if(reveal!==lastReveal){scene.style.setProperty('--reveal',reveal);lastReveal=reveal}
 if(cue!==lastCue){scene.style.setProperty('--cue',cue);lastCue=cue}
 const next=Number(reveal)>.015;
 if(next!==visible){visible=next;root.classList.toggle('hero-visible',visible);header.hidden=!visible;copy.hidden=!visible;document.getElementById('bottom').hidden=!visible;finishPicker.hidden=failed||!visible;finishPicker.inert=failed||!visible;document.getElementById('lower').hidden=!visible;document.getElementById('lower').inert=!visible;header.inert=!visible;copy.inert=!visible;header.setAttribute('aria-hidden',String(!visible));copy.setAttribute('aria-hidden',String(!visible))}
 cueElement.style.visibility=failed||reduced||progress>.075?'hidden':'visible';
}
function atlasDraw(context,rect,x,y){context.drawImage(atlas,rect[0],rect[1],rect[2],rect[3],x,y,rect[4],rect[5])}
function updateSettled(p){
 const {scale,ox,oy,left,top,wallWidth,wallHeight,wallDpr}=geometry;
 const layout=heroManifest[mobile?'mobile':'desktop'].layout;
 const reset=()=>{settledCtx.setTransform(wallDpr,0,0,wallDpr,0,0);settledCtx.clearRect(0,0,wallWidth,wallHeight);settledCtx.translate(ox-left,oy-top);settledCtx.scale(scale,scale)};
 if(p>=.999){const finish=Math.round(smooth((progress-facadeEnd)/(pathStart-facadeEnd))*12);if(!staticFull||finish!==lastFinish){reset();settledCtx.drawImage(settledImage,layout.bounds.x,layout.bounds.y);if(finish){settledCtx.globalCompositeOperation='source-atop';settledCtx.fillStyle=`rgba(255,204,133,${finish/12*.055})`;settledCtx.fillRect(layout.bounds.x,layout.bounds.y,layout.bounds.w,layout.bounds.h);settledCtx.globalCompositeOperation='source-over'}for(const tile of tiles)tile.settled=true;staticFull=true;lastFinish=finish}return}
 let rebuild=staticFull;staticFull=false;const added=[];
 for(const tile of tiles){const t=clamp((p-tile.start)/.16);const placed=t>=1||(reduced&&t>0);if(tile.settled&&!placed)rebuild=true;if(placed&&!tile.settled)added.push(tile);tile.settled=placed}
 if(rebuild){reset();for(const tile of tiles)if(tile.settled)atlasDraw(settledCtx,tile.face,tile.x,tile.y)}
 else if(added.length){settledCtx.setTransform(wallDpr*scale,0,0,wallDpr*scale,(ox-left)*wallDpr,(oy-top)*wallDpr);for(const tile of added)atlasDraw(settledCtx,tile.face,tile.x,tile.y)}
}
function draw(now){
 frame=0;const elapsed=lastFrameTime&&now-lastFrameTime<100?now-lastFrameTime:0;lastFrameTime=now;
 // Native scrolling already interpolates touch / trackpad movement. A second
 // time-based easing let the sticky scene leave while its text was still hidden.
 progress=target;updateUI();updatePath();
 if(ready){
 const p=clamp(progress/facadeEnd);
 // Adapt only moving fragments. The house and finished facade retain their resolution.
 if(mobile&&p>0&&p<.999&&elapsed>0){qualitySamples++;if(elapsed>25)slowFrames++;if(qualitySamples>=24){if(slowFrames>=8&&quality>.65){quality=quality===1?.8:.65;setupCanvases(false)}qualitySamples=0;slowFrames=0}}
 const {scale,ox,oy,flightTop,flightHeight}=geometry;
 const flying=p>0&&p<.999&&!reduced;
 if(flying||flightDrawn){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,flightHeight);ctx.translate(ox,oy-flightTop);ctx.scale(scale,scale);}
 flightDrawn=flying;
 updateSettled(p);
 if(flying)for(const tile of tiles){
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

}
listen(document,'visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;lastFrameTime=0}else schedule()});
listen(document.getElementById('request'),'click',rememberHeroFinish);
for(const button of finishPicker.querySelectorAll('[data-finish]'))listen(button,'click',()=>{if(button.dataset.finish!==heroFinish||facadePicker.getAttribute('aria-busy')==='true')loadScene(button.dataset.finish,true)});
for(const button of pathButtons)listen(button,'click',()=>{
 const finish=button.dataset.pathFinish;
 if(finish!==pathFinish||!pathFormat||pathPicker.getAttribute('aria-busy')==='true')loadPath(finish,true);
});
function syncPagePosition(){const past=scrollY>introTravel+height*.55;root.classList.toggle('past-hero',past);const nav=document.querySelector('.site-nav');if(nav){nav.inert=!past;nav.setAttribute('aria-hidden',String(!past))}const next=reduced?1:clamp(scrollY/Math.max(1,introTravel*.88));if(next!==target){target=next;progress=next;updateUI();schedule()}}
root.classList.add('page-scroll');
listen(window,'resize',()=>measure(),{passive:true});
listen(window,'orientationchange',()=>{clearTimeout(orientationTimer);orientationTimer=setTimeout(()=>{if(!controller.signal.aborted)measure(true)},300)});
listen(window,'scroll',syncPagePosition,{passive:true});
measure(true);loadScene();syncPagePosition();
return ()=>{controller.abort();sceneVersion++;pathVersion++;clearTimeout(orientationTimer);cancelAnimationFrame(frame);atlas?.close?.();root.classList.remove('ready','load-error','hero-visible','past-hero','page-scroll');const nav=document.querySelector('.site-nav');if(nav){nav.inert=true;nav.setAttribute('aria-hidden','true')}};
}
