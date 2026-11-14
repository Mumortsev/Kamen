'use strict';
const canvas=document.getElementById('cladding');
const ctx=canvas.getContext('2d',{alpha:false});
const finished=new Image(),unfinished=new Image();
finished.src='./assets/house-stone.webp';unfinished.src='./assets/house-bare.webp';
const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let width=0,height=0,dpr=1,progress=0,target=0,ready=false,frame=0;
let seed=78;function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646}
// Coordinates are authored against the 1536 × 1024 source photograph.
const front=[[202,455],[1175,393],[1177,767],[207,710]];
const side=[[1197,385],[1323,259],[1419,478],[1420,760],[1178,770],[1175,393]];
const openings=[[[265,497],[399,489],[401,669],[266,674]],[[824,477],[1089,461],[1091,676],[825,674]],[[528,477],[688,469],[689,714],[526,714]],[[1294,495],[1395,525],[1397,674],[1295,665]],[[1170,389],[1182,388],[1196,772],[1176,772]],[[413,574],[517,573],[530,705],[415,713]]];
const mask=new Path2D();
function pathPolygon(path,points){points.forEach((p,i)=>i?path.lineTo(...p):path.moveTo(...p));path.closePath()}
pathPolygon(mask,front);pathPolygon(mask,side);openings.forEach(p=>pathPolygon(mask,p));
const cells=[];
function wallCells(poly,columns,rows,sideWall){
 const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),x0=Math.min(...xs),y0=Math.min(...ys),x1=Math.max(...xs),y1=Math.max(...ys),cw=(x1-x0)/columns,ch=(y1-y0)/rows;
 const points=[];for(let r=0;r<=rows;r++){points[r]=[];for(let c=0;c<=columns;c++)points[r][c]=[x0+c*cw+(c&&c<columns?(random()-.5)*cw*.65:0),y0+r*ch+(r&&r<rows?(random()-.5)*ch*.55:0)]}
 for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
  const corners=[points[r][c],points[r][c+1],points[r+1][c+1],points[r+1][c]];
  const path=new Path2D();pathPolygon(path,corners);
  // Bottom-to-top placement with a diagonal wave across both elevations.
  const vertical=1-(r+.5)/rows,horizontal=c/columns;
  cells.push({path,start:vertical*.68+horizontal*.08+(sideWall?.06:0)+random()*.04,shift:8+random()*12,dx:(random()-.5)*12});
 }
}
wallCells(front,25,15,false);wallCells(side,9,22,true);
function getProgress(){const max=document.getElementById('story').offsetHeight-innerHeight;target=clamp(scrollY/Math.max(1,max));document.getElementById('percentage').textContent=Math.round(target*100)+'%';document.getElementById('fill').style.width=target*100+'%';document.getElementById('stage').textContent=target<.025?'ДО ОБЛИЦОВКИ':target>.98?'ПРИРОДНЫЙ ХАРАКТЕР':'КАМЕНЬ ЗА КАМНЕМ';requestDraw()}
function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);getProgress();requestDraw()}
function draw(){
 frame=0;if(!ready)return;
 progress=reduce?target:progress+(target-progress)*.16;
 if(Math.abs(progress-target)<.00015)progress=target;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#d4cfc4';ctx.fillRect(0,0,width,height);
 // Desktop fills the screen; mobile preserves the full building silhouette.
 const scale=width<700?width/1536:Math.max(width/1536,height/1024);
 const ox=(width-1536*scale)/2,oy=width<700?height*.60-512*scale:(height-1024*scale)/2;
 ctx.translate(ox,oy);ctx.scale(scale,scale);
 ctx.drawImage(finished,0,0,1536,1024);
 ctx.save();ctx.clip(mask,'evenodd');
 ctx.drawImage(unfinished,0,0,1536,1024);
 if(progress>.98){ctx.drawImage(finished,0,0,1536,1024)}else if(progress>0){
  for(const cell of cells){const t=clamp((progress-cell.start)/.13);if(t<=0)continue;const e=1-Math.pow(1-t,3);ctx.save();ctx.clip(cell.path);ctx.globalAlpha=reduce?1:clamp(t*2);ctx.drawImage(finished,cell.dx*(1-e),-cell.shift*(1-e),1536,1024);ctx.restore()}
 }
 ctx.restore();
 if(progress!==target)frame=requestAnimationFrame(draw);
}
function requestDraw(){if(!frame)frame=requestAnimationFrame(draw)}
function restart(){scrollTo({top:0,behavior:reduce?'instant':'smooth'})}
document.getElementById('restart').addEventListener('click',restart);document.getElementById('brand').addEventListener('click',e=>{e.preventDefault();restart()});
addEventListener('scroll',getProgress,{passive:true});addEventListener('resize',resize);
Promise.all([finished.decode(),unfinished.decode()]).then(()=>{ready=true;document.documentElement.classList.add('ready');resize()}).catch(()=>{document.getElementById('load-message').textContent='Не удалось загрузить сцену. Обновите страницу.'});
resize();
