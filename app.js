'use strict';
const root=document.documentElement;
const story=document.getElementById('story');
const scene=document.getElementById('hero');
const canvas=document.getElementById('cladding');
const ctx=canvas.getContext('2d',{alpha:true});
const header=document.getElementById('header');
const copy=document.getElementById('copy');
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const portrait=()=>innerWidth<=700||matchMedia('(max-aspect-ratio:4/5)').matches;
let mobile=portrait(),width=0,height=0,dpr=1,progress=0,target=0,frame=0,ready=false,visible=false,sceneVersion=0;
let before,after,mask,tiles=[],stoneLayer,oldWidth=0,staticFull=false,lastFrameTime=0;
let lastReveal="",lastCue="";
const cueElement=document.getElementById("cue");
const layouts={
 desktop:{w:1672,h:941,
  walls:[[[150,414],[377,393],[377,687],[150,684]],[[377,367],[442,370],[442,690],[377,695]],[[442,448],[754,425],[754,695],[442,691]],[[377,366],[754,336],[754,378],[442,401]],[[754,337],[838,321],[838,708],[754,705]],[[838,358],[1336,341],[1336,781],[838,735]],[[1366,346],[1577,478],[1577,675],[1366,782]]],
  holes:[[[225,450],[366,438],[366,645],[225,647]],[[575,433],[717,426],[717,688],[575,691]],[[943,400],[1208,384],[1208,658],[943,664]],[[1471,466],[1492,474],[1492,605],[1471,602]],[[1526,510],[1542,517],[1542,610],[1526,608]],[[788,444],[801,443],[801,501],[788,501]],[[1310,326],[1328,325],[1346,802],[1330,804]],[[1280,330],[1294,329],[1314,372],[1302,458],[1308,784],[1297,784],[1289,460],[1300,371]],[[149,651],[235,629],[311,656],[376,681],[376,727],[149,728]],[[886,680],[953,669],[1023,694],[1085,673],[1174,681],[1256,706],[1310,752],[1310,820],[885,820]]],
  bounds:{x:140,y:320,w:1440,h:490},cols:32,rows:18},
 mobile:{w:941,h:1672,
  walls:[[[82,855],[220,839],[220,1002],[82,1008]],[[220,818],[275,823],[275,1005],[220,1008]],[[275,859],[432,847],[432,1010],[275,1005]],[[220,817],[432,800],[432,839],[275,859]],[[432,800],[479,793],[479,1017],[432,1015]],[[479,817],[735,795],[735,1068],[479,1037]],[[759,820],[880,902],[880,1027],[759,1065]]],
  holes:[[[131,865],[211,857],[211,980],[131,982]],[[335,864],[403,859],[403,1004],[335,1004]],[[541,835],[682,828],[682,985],[541,985]],[[827,899],[838,907],[838,968],[827,964]],[[856,925],[864,931],[864,971],[856,969]],[[453,861],[462,859],[462,894],[453,895]],[[730,789],[741,789],[753,1068],[741,1068]],[[714,791],[724,789],[739,822],[734,887],[739,1066],[730,1066],[724,888],[731,822]],[[81,981],[121,970],[174,987],[219,1002],[219,1047],[81,1047]],[[501,1002],[562,986],[617,1001],[661,986],[714,1016],[735,1042],[735,1090],[501,1090]]],
  bounds:{x:78,y:790,w:805,h:290},cols:27,rows:16}
};
function polygon(path,points){points.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath()}
function makeMask(layout){const c=document.createElement('canvas');c.width=layout.w;c.height=layout.h;const m=c.getContext('2d');m.fillStyle='#fff';for(const wall of layout.walls){const p=new Path2D();polygon(p,wall);m.fill(p)}m.globalCompositeOperation='destination-out';for(const hole of layout.holes){const p=new Path2D();polygon(p,hole);m.fill(p)}return c}
function makeTiles(layout){let seed=123;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};const {x,y,w,h}=layout.bounds;const points=[];const cols=layout.cols,rows=layout.rows;for(let r=0;r<=rows;r++){points[r]=[];for(let c=0;c<=cols;c++)points[r][c]=[x+(c+(c&&c<cols?(random()-.5)*.56:0))*w/cols,y+(r+(r&&r<rows?(random()-.5)*.55:0))*h/rows]}
 const result=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const path=new Path2D();polygon(path,[points[r][c],points[r][c+1],points[r+1][c+1],points[r+1][c]]);result.push({path,corners:[points[r][c],points[r][c+1],points[r+1][c+1],points[r+1][c]],start:(1-(r+.5)/rows)*.75+c/cols*.07+random()*.035})}const raster=mask.getContext('2d').getImageData(0,0,layout.w,layout.h).data;
 const visibleTiles=result.filter(tile=>{const xs=tile.corners.map(p=>p[0]),ys=tile.corners.map(p=>p[1]);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);for(const fx of [.15,.5,.85])for(const fy of [.15,.5,.85]){const x=Math.round(x0+(x1-x0)*fx),y=Math.round(y0+(y1-y0)*fy);if(x>=0&&x<layout.w&&y>=0&&y<layout.h&&raster[(y*layout.w+x)*4+3]>20)return true}return false});
 const first=Math.min(...visibleTiles.map(tile=>tile.start));for(const tile of visibleTiles){
 tile.start=Math.max(0,tile.start-first-.025);
 const xs=tile.corners.map(p=>p[0]),ys=tile.corners.map(p=>p[1]);
 const x0=Math.floor(Math.min(...xs))-1,y0=Math.floor(Math.min(...ys))-1;
 const x1=Math.ceil(Math.max(...xs))+1,y1=Math.ceil(Math.max(...ys))+1;
 tile.x=x0;tile.y=y0;tile.cx=(x0+x1)/2;tile.cy=(y0+y1)/2;
 const sprite=document.createElement('canvas');sprite.width=x1-x0;sprite.height=y1-y0;
 const s=sprite.getContext('2d');s.translate(-x0,-y0);s.save();s.clip(tile.path);s.drawImage(after,0,0,layout.w,layout.h);s.restore();s.globalCompositeOperation='destination-in';s.drawImage(mask,0,0);
 tile.sprite=sprite;
 // A separate mineral-textured silhouette supplies real visible side faces.
 const edge=document.createElement('canvas');edge.width=sprite.width;edge.height=sprite.height;
 const side=edge.getContext('2d');side.drawImage(sprite,0,0);side.globalCompositeOperation='source-in';
 const material=side.createLinearGradient(0,0,edge.width,edge.height);material.addColorStop(0,'#ac9877');material.addColorStop(.4,'#8e795a');material.addColorStop(1,'#4f4635');side.fillStyle=material;side.fillRect(0,0,edge.width,edge.height);
 side.globalCompositeOperation='source-atop';
 for(let grain=0;grain<90;grain++){side.fillStyle=grain%3?'rgba(37,31,22,.17)':'rgba(241,224,185,.22)';side.fillRect(random()*edge.width,random()*edge.height,.7+random()*1.7,.5+random())}
 tile.depth=(mobile?9:12)+random()*(mobile?5:7);
 const pad=Math.ceil(tile.depth+18);tile.padding=pad;
 const volume=document.createElement('canvas');volume.width=sprite.width+pad*2;volume.height=sprite.height+pad*2;
 const v=volume.getContext('2d');v.save();v.shadowColor='rgba(12,15,10,.48)';v.shadowBlur=8;v.shadowOffsetX=tile.depth*.35;v.shadowOffsetY=tile.depth*.65;v.drawImage(edge,pad+tile.depth*.45,pad+tile.depth*.7);v.restore();
 const layers=Math.ceil(tile.depth);for(let layer=layers;layer>0;layer--){const z=tile.depth*layer/layers;v.drawImage(edge,pad+z*.45,pad+z*.7)}
 tile.volume=volume;tile.settled=false;
 // Bake the bevel light into the face as well.
 s.globalCompositeOperation='source-atop';s.save();s.clip(tile.path);s.lineWidth=1;s.strokeStyle='rgba(232,214,177,.3)';s.beginPath();s.moveTo(...tile.corners[0]);s.lineTo(...tile.corners[1]);s.stroke();s.restore();
 // Each photographic stone fragment enters from outside the frame, with its own trajectory.
 const fromRight=tile.cx>layout.w*.52;
 tile.originX=(fromRight?layout.w+100+random()*170:-100-random()*170)-tile.cx;
 tile.originY=(random()-.2)*(mobile?230:300)+70;
 tile.turn=(random()-.5)*.22;
 tile.arc=(random()-.5)*(mobile?30:42);
 }return visibleTiles}
function schedule(){if(!frame)frame=requestAnimationFrame(draw)}
function updateProgress(){schedule()}
function measure(force=false){const nextMobile=portrait();const widthChanged=Math.abs(innerWidth-oldWidth)>2;if(!force&&!widthChanged)return;oldWidth=innerWidth;width=innerWidth;
 // Capture the visible viewport only on real width/orientation changes.
 // Swipe and mobile browser chrome changes do not alter image geometry.
 height=Math.round(window.visualViewport?.height||innerHeight);
 root.style.setProperty('--scene-h',height+'px');root.style.setProperty('--vh',height/100+'px');dpr=Math.min(devicePixelRatio||1,mobile?1.5:1.75);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 if(nextMobile!==mobile){mobile=nextMobile;loadScene()}updateProgress();schedule()}
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url})}
async function loadScene(){const version=++sceneVersion;ready=false;root.classList.remove('ready','load-error');const name=mobile?'mobile':'desktop';try{const [b,a]=await Promise.all([loadImage(`./assets/${name}-concrete.webp`),loadImage(`./assets/${name}-after.webp`)]);if(version!==sceneVersion)return;before=b;after=a;const layout=layouts[name];mask=makeMask(layout);tiles=makeTiles(layout);stoneLayer=document.createElement('canvas');stoneLayer.width=layout.w;stoneLayer.height=layout.h;staticFull=false;lastFrameTime=0;ready=true;root.classList.add('ready');schedule()}catch{if(version!==sceneVersion)return;root.classList.add('load-error');document.getElementById('loader').textContent='Сцена не загрузилась. Обновите страницу.'}}
function updateUI(){
 const reveal=smooth((progress-.67)/.17).toFixed(3),cue=(1-smooth(progress/.12)).toFixed(3);
 if(reveal!==lastReveal){root.style.setProperty('--reveal',reveal);lastReveal=reveal}
 if(cue!==lastCue){root.style.setProperty('--cue',cue);lastCue=cue}
 const next=Number(reveal)>.015;
 if(next!==visible){visible=next;root.classList.toggle('hero-visible',visible);header.hidden=!visible;copy.hidden=!visible;document.getElementById('bottom').hidden=!visible;document.getElementById('lower').hidden=!visible;document.getElementById('lower').inert=!visible;header.inert=!visible;copy.inert=!visible;header.setAttribute('aria-hidden',String(!visible));copy.setAttribute('aria-hidden',String(!visible))}
 cueElement.style.visibility=progress>.15?'hidden':'visible';
}
function updateSettled(p,layout){
 const stone=stoneLayer.getContext('2d');
 if(p>=.999){if(!staticFull){stone.clearRect(0,0,layout.w,layout.h);stone.drawImage(after,0,0,layout.w,layout.h);stone.globalCompositeOperation='destination-in';stone.drawImage(mask,0,0);stone.globalCompositeOperation='source-over';for(const tile of tiles)tile.settled=true;staticFull=true}return}
 let rebuild=staticFull;staticFull=false;const added=[];
 for(const tile of tiles){const t=clamp((p-tile.start)/.22);const placed=t>=1||(reduced&&t>0);if(tile.settled&&!placed)rebuild=true;if(placed&&!tile.settled)added.push(tile);tile.settled=placed}
 if(rebuild){stone.clearRect(0,0,layout.w,layout.h);for(const tile of tiles)if(tile.settled)stone.drawImage(tile.sprite,tile.x,tile.y)}
 else for(const tile of added)stone.drawImage(tile.sprite,tile.x,tile.y);
}
function draw(now){
 frame=0;const dt=lastFrameTime?Math.min(50,Math.max(1,now-lastFrameTime)):16.67;lastFrameTime=now;
 const blend=1-Math.exp(-dt/55);progress=reduced?target:progress+(target-progress)*blend;
 if(Math.abs(target-progress)<.0001)progress=target;updateUI();
 if(ready){
 const layout=layouts[mobile?'mobile':'desktop'];const scale=Math.min(width/layout.w,height/layout.h),ox=(width-layout.w*scale)/2,oy=(height-layout.h*scale)/2;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.translate(ox,oy);ctx.scale(scale,scale);
 // The fixed photo remains in its GPU-composited DOM layer; only stones are redrawn.
 const p=clamp(progress/.62);updateSettled(p,layout);ctx.drawImage(stoneLayer,0,0);
 if(p>0&&p<.999&&!reduced)for(const tile of tiles){
 const t=clamp((p-tile.start)/.22);if(t<=0||t>=1)continue;
 const ease=1-Math.pow(1-t,2.4),remaining=1-ease,seating=1-smooth((t-.78)/.22);
 const x=tile.cx+tile.originX*remaining;
 const y=tile.cy+tile.originY*remaining+Math.sin(t*Math.PI)*tile.arc-3*seating;
 const size=1+remaining*.23,sx=tile.x-tile.cx,sy=tile.y-tile.cy;
 // A rotated conservative bound avoids drawing sprites outside the viewport.
 const radius=(tile.volume.width+tile.volume.height)*size*.55;
 if(x+radius < -ox/scale || x-radius > (width-ox)/scale || y+radius < -oy/scale || y-radius > (height-oy)/scale)continue;
 ctx.save();ctx.translate(x,y);ctx.rotate(tile.turn*remaining);ctx.scale(size*(1-.08*seating),size*(1-.13*seating));
 if(seating>.005){ctx.globalAlpha=seating;ctx.drawImage(tile.volume,sx-tile.padding,sy-tile.padding);ctx.globalAlpha=1}
 ctx.drawImage(tile.sprite,sx,sy);ctx.restore();
 }
 }
 if(progress!==target)schedule();else lastFrameTime=0;
}
function restart(){target=0;schedule()}
document.getElementById('restart').addEventListener('click',restart);document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();restart()});
const dialog=document.getElementById('contact');document.getElementById('request').addEventListener('click',()=>dialog.showModal());dialog.querySelector('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close()}});
// Capture input while the page itself stays fixed. Dialog gestures remain native.
let touchX=0,touchY=0,touchActive=false;
function advance(delta){if(!ready||dialog.open)return;target=clamp(target+delta);schedule()}
scene.addEventListener('wheel',event=>{if(dialog.open||event.ctrlKey)return;event.preventDefault();const unit=event.deltaMode===1?16:event.deltaMode===2?height:1;advance(event.deltaY*unit/Math.max(1,height*1.5));},{passive:false});
scene.addEventListener('touchstart',event=>{if(dialog.open||event.touches.length!==1){touchActive=false;return}touchX=event.touches[0].clientX;touchY=event.touches[0].clientY;touchActive=true},{passive:true});
scene.addEventListener('touchmove',event=>{if(!touchActive||dialog.open||event.touches.length!==1)return;const touch=event.touches[0];const deltaY=touchY-touch.clientY;const deltaX=touchX-touch.clientX;touchY=touch.clientY;touchX=touch.clientX;if(Math.abs(deltaY)>=Math.abs(deltaX)){event.preventDefault();advance(deltaY/Math.max(1,height*.95))}},{passive:false});
scene.addEventListener('touchend',()=>{touchActive=false},{passive:true});scene.addEventListener('touchcancel',()=>{touchActive=false},{passive:true});
addEventListener('keydown',event=>{if(dialog.open||event.target.closest('a,button,input,textarea,select'))return;const amounts={ArrowDown:.055,ArrowUp:-.055,PageDown:.25,PageUp:-.25,' ':.22};if(event.key==='Home'){event.preventDefault();restart()}else if(event.key==='End'){event.preventDefault();target=1;schedule()}else if(event.key in amounts){event.preventDefault();advance(amounts[event.key])}});
addEventListener('resize',()=>measure(),{passive:true});addEventListener('orientationchange',()=>setTimeout(()=>measure(true),300));measure(true);loadScene();
