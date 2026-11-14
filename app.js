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
let before,after,mask,tiles=[],stoneLayer,oldWidth=0;
const layouts={
 desktop:{w:1672,h:941,
  walls:[[[150,414],[377,393],[377,687],[150,684]],[[377,367],[442,370],[442,690],[377,695]],[[442,448],[754,425],[754,695],[442,691]],[[377,366],[754,336],[754,378],[442,401]],[[754,337],[838,321],[838,708],[754,705]],[[838,358],[1336,341],[1336,781],[838,735]],[[1366,346],[1577,478],[1577,675],[1366,782]]],
  holes:[[[225,450],[366,438],[366,645],[225,647]],[[575,433],[717,426],[717,688],[575,691]],[[943,400],[1208,384],[1208,658],[943,664]],[[1471,466],[1492,474],[1492,605],[1471,602]],[[1526,510],[1542,517],[1542,610],[1526,608]],[[788,444],[801,443],[801,501],[788,501]],[[1310,326],[1328,325],[1346,802],[1330,804]],[[1280,330],[1294,329],[1314,372],[1302,458],[1308,784],[1297,784],[1289,460],[1300,371]],[[149,651],[235,629],[311,656],[376,681],[376,727],[149,728]],[[886,680],[953,669],[1023,694],[1085,673],[1174,681],[1256,706],[1310,752],[1310,820],[885,820]]],
  bounds:{x:140,y:320,w:1440,h:490},cols:43,rows:22},
 mobile:{w:941,h:1672,
  walls:[[[82,855],[220,839],[220,1002],[82,1008]],[[220,818],[275,823],[275,1005],[220,1008]],[[275,859],[432,847],[432,1010],[275,1005]],[[220,817],[432,800],[432,839],[275,859]],[[432,800],[479,793],[479,1017],[432,1015]],[[479,817],[735,795],[735,1068],[479,1037]],[[759,820],[880,902],[880,1027],[759,1065]]],
  holes:[[[131,865],[211,857],[211,980],[131,982]],[[335,864],[403,859],[403,1004],[335,1004]],[[541,835],[682,828],[682,985],[541,985]],[[827,899],[838,907],[838,968],[827,964]],[[856,925],[864,931],[864,971],[856,969]],[[453,861],[462,859],[462,894],[453,895]],[[730,789],[741,789],[753,1068],[741,1068]],[[714,791],[724,789],[739,822],[734,887],[739,1066],[730,1066],[724,888],[731,822]],[[81,981],[121,970],[174,987],[219,1002],[219,1047],[81,1047]],[[501,1002],[562,986],[617,1001],[661,986],[714,1016],[735,1042],[735,1090],[501,1090]]],
  bounds:{x:78,y:790,w:805,h:290},cols:37,rows:20}
};
function polygon(path,points){points.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath()}
function makeMask(layout){const c=document.createElement('canvas');c.width=layout.w;c.height=layout.h;const m=c.getContext('2d');m.fillStyle='#fff';for(const wall of layout.walls){const p=new Path2D();polygon(p,wall);m.fill(p)}m.globalCompositeOperation='destination-out';for(const hole of layout.holes){const p=new Path2D();polygon(p,hole);m.fill(p)}return c}
function makeTiles(layout){let seed=123;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};const {x,y,w,h}=layout.bounds;const points=[];const cols=layout.cols,rows=layout.rows;for(let r=0;r<=rows;r++){points[r]=[];for(let c=0;c<=cols;c++)points[r][c]=[x+(c+(c&&c<cols?(random()-.5)*.56:0))*w/cols,y+(r+(r&&r<rows?(random()-.5)*.55:0))*h/rows]}
 const result=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const path=new Path2D();polygon(path,[points[r][c],points[r][c+1],points[r+1][c+1],points[r+1][c]]);result.push({path,corners:[points[r][c],points[r][c+1],points[r+1][c+1],points[r+1][c]],start:(1-(r+.5)/rows)*.75+c/cols*.07+random()*.035})}return result}
function schedule(){if(!frame)frame=requestAnimationFrame(draw)}
function updateProgress(){const distance=Math.max(1,height*2.2);target=clamp(scrollY/distance);schedule()}
function measure(force=false){const nextMobile=portrait();const widthChanged=Math.abs(innerWidth-oldWidth)>2;if(!force&&!widthChanged)return;oldWidth=innerWidth;width=innerWidth;
 // Lock to the large viewport. Mobile URL-bar height changes never resize the scene.
 const probe=document.createElement('div');probe.style.cssText='position:fixed;pointer-events:none;visibility:hidden;height:100lvh;width:1px';document.body.append(probe);height=Math.round(probe.getBoundingClientRect().height)||innerHeight;probe.remove();
 root.style.setProperty('--scene-h',height+'px');root.style.setProperty('--vh',height/100+'px');dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 if(nextMobile!==mobile){mobile=nextMobile;loadScene()}updateProgress();schedule()}
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url})}
async function loadScene(){const version=++sceneVersion;ready=false;root.classList.remove('ready','load-error');const name=mobile?'mobile':'desktop';try{const [b,a]=await Promise.all([loadImage(`./assets/${name}-before.webp`),loadImage(`./assets/${name}-after.webp`)]);if(version!==sceneVersion)return;before=b;after=a;const layout=layouts[name];mask=makeMask(layout);tiles=makeTiles(layout);stoneLayer=document.createElement('canvas');stoneLayer.width=layout.w;stoneLayer.height=layout.h;ready=true;root.classList.add('ready');schedule()}catch{if(version!==sceneVersion)return;root.classList.add('load-error');document.getElementById('loader').textContent='Сцена не загрузилась. Обновите страницу.'}}
function updateUI(){const reveal=smooth((progress-.80)/.15);root.style.setProperty('--reveal',reveal.toFixed(4));root.style.setProperty('--cue',(1-smooth(progress/.12)).toFixed(4));const next=reveal>.015;if(next!==visible){visible=next;root.classList.toggle('hero-visible',visible);header.hidden=!visible;copy.hidden=!visible;document.getElementById('bottom').hidden=!visible;header.inert=!visible;copy.inert=!visible;header.setAttribute('aria-hidden',String(!visible));copy.setAttribute('aria-hidden',String(!visible))}document.getElementById('cue').style.visibility=progress>.15?'hidden':'visible'}
function draw(){frame=0;progress=reduced?target:progress+(target-progress)*.18;if(Math.abs(target-progress)<.0001)progress=target;updateUI();if(ready){const layout=layouts[mobile?'mobile':'desktop'];const scale=Math.min(width/layout.w,height/layout.h),ox=(width-layout.w*scale)/2,oy=(height-layout.h*scale)/2;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.drawImage(before,0,0,layout.w,layout.h);
 const p=clamp((progress-.015)/.745);if(p>0){const stone=stoneLayer.getContext('2d');stone.clearRect(0,0,layout.w,layout.h);stone.globalCompositeOperation='source-over';if(p>=.999){stone.drawImage(after,0,0,layout.w,layout.h)}else{const placed=new Path2D();for(const tile of tiles){const t=clamp((p-tile.start)/.12);if(t>=1){polygon(placed,tile.corners)}}stone.save();stone.clip(placed);stone.drawImage(after,0,0,layout.w,layout.h);stone.restore();if(!reduced)for(const tile of tiles){const t=clamp((p-tile.start)/.12);if(t<=0||t>=1)continue;stone.save();stone.clip(tile.path);stone.globalAlpha=smooth(t);stone.drawImage(after,0,0,layout.w,layout.h);stone.restore()}}
 stone.globalCompositeOperation='destination-in';stone.drawImage(mask,0,0);stone.globalCompositeOperation='source-over';ctx.drawImage(stoneLayer,0,0)}}
 if(progress!==target)schedule()}
function restart(){scrollTo({top:0,behavior:reduced?'instant':'smooth'})}
document.getElementById('restart').addEventListener('click',restart);document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();restart()});
const dialog=document.getElementById('contact');document.getElementById('request').addEventListener('click',()=>dialog.showModal());dialog.querySelector('.close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close()}});
addEventListener('scroll',updateProgress,{passive:true});addEventListener('resize',()=>measure(),{passive:true});addEventListener('orientationchange',()=>setTimeout(()=>measure(true),300));measure(true);loadScene();
