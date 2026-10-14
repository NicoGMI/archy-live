import * as THREE from 'three'
// Textures procédurales (canvas) : aucune image externe, tout est généré par Three.js / canvas.
const rng=(s)=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
function mk(w,h,draw,{repeat=[1,1],aniso=4,srgb=true}={}){
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h)
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat[0],repeat[1]);t.anisotropy=aniso;t.userData.keep=true
  if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t}
const speckle=(x,w,h,R,n,cols,size=[1,3],alpha=.35)=>{for(let i=0;i<n;i++){x.globalAlpha=alpha*(.4+R()*.6);x.fillStyle=cols[(R()*cols.length)|0];const s=size[0]+R()*(size[1]-size[0]);x.fillRect(R()*w,R()*h,s,s)};x.globalAlpha=1}
export const T={}
T.grass=(rep=48)=>mk(256,256,(x,w,h)=>{const R=rng(3);x.fillStyle='#f4f2e6';x.fillRect(0,0,w,h)
  speckle(x,w,h,R,2600,['#ffffff','#c8c4a8','#e8e4c0','#b8b890'],[1,3],.5)
  x.lineWidth=1;for(let i=0;i<900;i++){const px=R()*w,py=R()*h;x.strokeStyle=R()<.5?'rgba(120,140,60,.45)':'rgba(255,250,200,.4)';x.beginPath();x.moveTo(px,py);x.lineTo(px+(R()-.5)*3,py-2-R()*4);x.stroke()}},{repeat:[rep,rep]})
T.path=(rx=1,ry=4)=>mk(128,128,(x,w,h)=>{const R=rng(5);x.fillStyle='#f0dcc0';x.fillRect(0,0,w,h)
  for(let j=0;j<8;j++)for(let i=0;i<8;i++){const o=j%2?8:0;x.fillStyle=`hsl(32,${35+R()*15}%,${72+R()*12}%)`;x.fillRect(i*16+o+1,j*16+1,14,14)}
  speckle(x,w,h,R,300,['#a98760','#fff2d8'],[1,2],.3)},{repeat:[rx,ry]})
T.plaza=(rep=3)=>mk(256,256,(x,w,h)=>{const R=rng(9);x.fillStyle='#d9b88c';x.fillRect(0,0,w,h)
  for(let j=0;j<8;j++)for(let i=0;i<8;i++){x.fillStyle=`hsl(${30+R()*8},${38+R()*14}%,${66+R()*14}%)`;x.fillRect(i*32+1.5,j*32+1.5,29,29)}
  speckle(x,w,h,R,500,['#8a6a46','#fff0d0'],[1,2],.25)},{repeat:[rep,rep]})
T.wood=(rep=[1,1],base='#b07a45')=>mk(256,256,(x,w,h)=>{const R=rng(21);x.fillStyle=base;x.fillRect(0,0,w,h)
  for(let j=0;j<8;j++){x.fillStyle=`rgba(${R()<.5?'255,220,170':'60,30,10'},${.06+R()*.12})`;x.fillRect(0,j*32,w,32)
    x.strokeStyle='rgba(50,25,8,.55)';x.lineWidth=2;x.beginPath();x.moveTo(0,j*32);x.lineTo(w,j*32);x.stroke()
    x.strokeStyle='rgba(60,30,10,.22)';x.lineWidth=1;for(let k=0;k<6;k++){const y=j*32+4+R()*24;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(w*.3,y+R()*4-2,w*.6,y+R()*4-2,w,y+R()*3-1.5);x.stroke()}
    const bx=R()*w;x.strokeStyle='rgba(50,25,8,.5)';x.lineWidth=2;x.beginPath();x.moveTo(bx,j*32);x.lineTo(bx,j*32+32);x.stroke()}},{repeat:rep})
T.plaster=(base='#f4dcb8',rep=[1,1])=>mk(256,256,(x,w,h)=>{const R=rng(33);x.fillStyle=base;x.fillRect(0,0,w,h)
  speckle(x,w,h,R,2200,['#ffffff','#c9a77a','#8a6a46'],[1,3],.18)
  for(let i=0;i<40;i++){x.fillStyle=`rgba(255,255,255,${R()*.07})`;x.beginPath();x.arc(R()*w,R()*h,10+R()*40,0,7);x.fill()}},{repeat:rep})
T.wallpaper=(c1='#f3c9a0',c2='#e8a97c',rep=[1,1])=>mk(128,128,(x,w,h)=>{x.fillStyle=c1;x.fillRect(0,0,w,h);x.fillStyle=c2
  for(let j=0;j<4;j++)for(let i=0;i<4;i++){const cx=i*32+16+(j%2?16:0),cy=j*32+16;x.beginPath();x.moveTo(cx,cy-7);x.lineTo(cx+5,cy);x.lineTo(cx,cy+7);x.lineTo(cx-5,cy);x.closePath();x.globalAlpha=.55;x.fill()}
  x.globalAlpha=.12;x.fillStyle='#000';for(let i=0;i<w;i+=16)x.fillRect(i,0,1,h);x.globalAlpha=1},{repeat:rep})
T.brick=(base='#b9674a',rep=[1,1])=>mk(256,256,(x,w,h)=>{const R=rng(41);x.fillStyle='#d9c5a8';x.fillRect(0,0,w,h)
  for(let j=0;j<16;j++)for(let i=-1;i<8;i++){const o=j%2?16:0;x.fillStyle=base;x.globalAlpha=.7+R()*.3;x.filter=`hue-rotate(${(R()*14-7)|0}deg)`;x.fillRect(i*32+o+1,j*16+1,30,14)}
  x.filter='none';x.globalAlpha=1},{repeat:rep})
T.roof=(color='#c0654a',rep=[3,2])=>mk(256,256,(x,w,h)=>{const R=rng(51);x.fillStyle=color;x.fillRect(0,0,w,h)
  for(let j=0;j<8;j++)for(let i=-1;i<8;i++){const o=j%2?16:0,cx=i*32+o+16,cy=j*32+16;x.fillStyle=`rgba(${R()<.5?'255,255,255':'0,0,0'},${.05+R()*.12})`;x.beginPath();x.arc(cx,cy-4,17,0,Math.PI);x.lineTo(cx-17,cy-24);x.lineTo(cx+17,cy-24);x.fill()
    x.strokeStyle='rgba(0,0,0,.32)';x.lineWidth=2;x.beginPath();x.arc(cx,cy-4,16,0,Math.PI);x.stroke()}},{repeat:rep})
T.stone=(rep=[2,1])=>mk(128,128,(x,w,h)=>{const R=rng(61);x.fillStyle='#b8a98c';x.fillRect(0,0,w,h)
  for(let j=0;j<4;j++){let px=0;while(px<w){const sw=20+R()*26;x.fillStyle=`hsl(38,${12+R()*10}%,${58+R()*16}%)`;x.fillRect(px+1,j*32+1,sw-2,30);px+=sw}}},{repeat:rep})
T.water=()=>mk(256,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'#d99aa0');g.addColorStop(1,'#b87c9a');x.fillStyle=g;x.fillRect(0,0,w,h)
  const R=rng(71);x.strokeStyle='rgba(255,240,220,.45)';x.lineWidth=2;for(let i=0;i<46;i++){const px=R()*w,py=R()*h;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+10,py-3,px+22,py);x.stroke()}},{repeat:[3,2]})
T.rug=(c='#9a3b3b')=>mk(128,128,(x,w,h)=>{x.fillStyle=c;x.fillRect(0,0,w,h);x.strokeStyle='#f1d9a0';x.lineWidth=5;x.strokeRect(9,9,w-18,h-18);x.lineWidth=2;x.strokeRect(20,20,w-40,h-40);x.fillStyle='#f1d9a0';x.beginPath();x.moveTo(w/2,36);x.lineTo(w-36,h/2);x.lineTo(w/2,h-36);x.lineTo(36,h/2);x.fill()})
export const texMat=(map,o={})=>new THREE.MeshLambertMaterial({map,...o})
const cache={}
export const tx=(name,...a)=>cache[name+a.join('|')]||(cache[name+a.join('|')]=T[name](...a))
