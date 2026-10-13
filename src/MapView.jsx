import React,{useEffect,useRef,useState} from 'react'
import * as THREE from 'three'
import {Toggle} from './shared.jsx'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
// Même JSON que la V1. Bâtiment = univers, fenêtres = tâches, dresseur = chantier actif, PNJ = attente / programmé.
const URL_DATA=import.meta.env.BASE_URL+'data/archy-status.json'
const SC={active:'#4ade80',waiting:'#fbbf24',scheduled:'#60a5fa',blocked:'#ef4444',queued:'#9ca3af',done:'#6b7280'}
const SLOTS=8,RING=13.5
const rngf=(s)=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
const R=rngf(11)
const noise=(x,z)=>Math.sin(x*.21)*Math.cos(z*.17)+.5*Math.sin(x*.47+z*.31)+.25*Math.sin(z*.9-x*.6)
const hill=(x,z)=>{const r=Math.hypot(x,z);const k=Math.min(1,Math.max(0,(r-26)/22));return k*k*(2.5+2.2*noise(x,z)+ (r-26)*.05)}
const slotPos=i=>{const a=-Math.PI/2+i*Math.PI*2/SLOTS+Math.PI/SLOTS;return{a,x:Math.cos(a)*RING,z:Math.sin(a)*RING}}
const M=(c,o={})=>new THREE.MeshLambertMaterial({color:c,...o})
function label(text,color='#fff',size=56,bg='rgba(255,255,255,.92)',fg='#1f2937'){
  const c=document.createElement('canvas'),x=c.getContext('2d');x.font=`700 ${size}px system-ui,sans-serif`
  const w=Math.ceil(x.measureText(text).width)+56,h=size+36;c.width=w;c.height=h;x.font=`700 ${size}px system-ui,sans-serif`
  x.fillStyle=bg;x.beginPath();x.roundRect(4,4,w-8,h-8,h/2.4);x.fill();x.lineWidth=8;x.strokeStyle=color;x.stroke()
  x.fillStyle=fg;x.textBaseline='middle';x.fillText(text,28,h/2+3)
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(w/h*.8,.8,1);s.renderOrder=10;return s}
function bubble(ch,col){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')
  x.fillStyle='#fff';x.beginPath();x.arc(64,60,50,0,7);x.fill();x.lineWidth=10;x.strokeStyle=col;x.stroke()
  x.fillStyle=col;x.font='bold 74px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(ch,64,64)
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(.7,.7,1);s.renderOrder=11;return s}
function trainer(shirt,hat='#ef4444'){
  const g=new THREE.Group(),sk=M('#f6cfa4')
  const mk=(geo,m,y)=>{const o=new THREE.Mesh(geo,m);o.position.y=y;o.castShadow=true;g.add(o);return o}
  const legs=[-1,1].map(s=>{const p=new THREE.Group();p.position.set(s*.11,.42,0);const l=new THREE.Mesh(new THREE.BoxGeometry(.15,.42,.17),M('#334155'));l.position.y=-.21;l.castShadow=true;p.add(l);g.add(p);return p})
  mk(new THREE.BoxGeometry(.42,.46,.26),M(shirt),.65)
  const arms=[-1,1].map(s=>{const p=new THREE.Group();p.position.set(s*.28,.82,0);const a=new THREE.Mesh(new THREE.BoxGeometry(.12,.38,.13),M(shirt));a.position.y=-.17;p.add(a);g.add(p);return p})
  mk(new THREE.SphereGeometry(.2,14,12),sk,1.06)
  const cap=mk(new THREE.SphereGeometry(.215,14,10,0,Math.PI*2,0,Math.PI/2),M(hat),1.1)
  const br=new THREE.Mesh(new THREE.BoxGeometry(.3,.03,.2),M(hat));br.position.set(0,1.1,.2);g.add(br)
  g.userData={legs,arms};return g}
function house(u,tasks){
  const g=new THREE.Group(),W=4.6,D=3.6,H=2.3
  const wall=new THREE.Mesh(new THREE.BoxGeometry(W,H,D),M('#f4dcb8'));wall.position.y=H/2+.15;wall.castShadow=wall.receiveShadow=true;g.add(wall)
  const base=new THREE.Mesh(new THREE.BoxGeometry(W+.12,.35,D+.12),M('#b8a98c'));base.position.y=.17;g.add(base)
  const sh=new THREE.Shape();sh.moveTo(-D/2-.45,0);sh.lineTo(D/2+.45,0);sh.lineTo(.18,1.5);sh.lineTo(-.18,1.5);sh.closePath()
  const rgm=new THREE.ExtrudeGeometry(sh,{depth:W+.9,bevelEnabled:false});rgm.translate(0,0,-(W+.9)/2);rgm.rotateY(Math.PI/2)
  const pr=new THREE.Mesh(rgm,M(new THREE.Color(u.color).lerp(new THREE.Color('#c98a6a'),.3)));pr.position.y=H+.15;pr.castShadow=true;g.add(pr)
  const gab=new THREE.Mesh(new THREE.BoxGeometry(W*.35,.5,.08),M('#ffffff'));gab.position.set(0,H+.5,D/2+.1);gab.visible=false;g.add(gab)
  const band=new THREE.Mesh(new THREE.BoxGeometry(W+.5,.14,D+.5),M('#ffffff'));band.position.y=H+.18;g.add(band)
  const door=new THREE.Mesh(new THREE.BoxGeometry(.9,1.5,.12),M('#7c4a22'));door.position.set(0,.9,D/2+.05);g.add(door)
  const step=new THREE.Mesh(new THREE.BoxGeometry(1.5,.15,.7),M('#cbbf9f'));step.position.set(0,.22,D/2+.3);g.add(step)
  const chim=new THREE.Mesh(new THREE.BoxGeometry(.5,1.1,.5),M('#9a5b43'));chim.position.set(W*.25,H+1.3,-D*.1);chim.castShadow=true;g.add(chim)
  const dk=M('#5a3a22'),wm=new THREE.MeshBasicMaterial({color:'#ffd27a'})
  const door2=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.7,.06),M('#f7e6c8'));door2.position.set(0,.98,D/2+.0);g.add(door2)
  const knob=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),new THREE.MeshBasicMaterial({color:'#f5c542'}));knob.position.set(.28,.9,D/2+.12);g.add(knob)
  const dw=new THREE.Mesh(new THREE.BoxGeometry(.3,.4,.03),wm);dw.position.set(0,1.35,D/2+.1);g.add(dw)
  const aw=new THREE.Mesh(new THREE.BoxGeometry(1.6,.1,.7),M(u.color));aw.position.set(0,1.95,D/2+.38);aw.rotation.x=.25;aw.castShadow=true;g.add(aw)
  ;[-1,1].forEach(sd=>{const pst=new THREE.Mesh(new THREE.BoxGeometry(.08,1.5,.08),dk);pst.position.set(sd*.75,1.0,D/2+.6);g.add(pst)
    for(let k=0;k<2;k++){const sw=new THREE.Mesh(new THREE.BoxGeometry(.5,.5,.03),wm);sw.position.set(sd*(W/2+.02),1.7,(k?1:-1)*.9);sw.rotation.y=Math.PI/2;g.add(sw)
      const sf=new THREE.Mesh(new THREE.BoxGeometry(.6,.6,.02),M('#fff6e6'));sf.position.set(sd*(W/2+.005),1.7,(k?1:-1)*.9);sf.rotation.y=Math.PI/2;g.add(sf)}})
  const cap=new THREE.Mesh(new THREE.BoxGeometry(.65,.14,.65),M('#6b3f2e'));cap.position.set(W*.25,H+1.9,-D*.1);g.add(cap)
  const sgn=new THREE.Mesh(new THREE.BoxGeometry(1.5,.38,.08),M(u.color));sgn.position.set(-1.55,2.75-.1,D/2+.28);g.add(sgn)
  const n=Math.min(tasks.length,6)
  tasks.slice(0,6).forEach((t,k)=>{const col=new THREE.Color(SC[t.status]||'#999'),act=t.status==='active'
    const x=-W/2+.75+k*((W-1.5)/Math.max(1,5))*(5/Math.max(5,n-1||1))
    const wx=n===1?-1.4:-W/2+.8+k*((W-1.6)/(n-1||1))*(n>1?1:0)
    const fr=new THREE.Mesh(new THREE.BoxGeometry(.62,.62,.1),M('#fff6e6'));const px=n<=1?-1.5:-W/2+.75+k*(W-1.5-(n>3?0:1.0))/(n-1)
    fr.position.set(px,1.85,D/2+.03);g.add(fr)
    ;[-1,1].forEach(sd=>{const sh=new THREE.Mesh(new THREE.BoxGeometry(.18,.62,.06),dk);sh.position.set(px+sd*.42,1.85,D/2+.05);g.add(sh)})
    const fb=new THREE.Mesh(new THREE.BoxGeometry(.66,.14,.2),M('#8a5a33'));fb.position.set(px,1.48,D/2+.12);g.add(fb)
    for(let q=0;q<3;q++){const fo=new THREE.Mesh(new THREE.SphereGeometry(.07,6,5),M(['#ff7b9c','#ffd24a','#ffa05c'][q]));fo.position.set(px-.2+q*.2,1.58,D/2+.14);g.add(fo)}
    const gl=new THREE.Mesh(new THREE.BoxGeometry(.46,.46,.12),new THREE.MeshBasicMaterial({color:t.status==='done'?'#8fb0c8':col}));gl.position.set(px,1.85,D/2+.06);gl.userData.act=act;g.add(gl)
    if(t.status==='done'){const tick=bubble('✓','#16a34a');tick.scale.set(.32,.32,1);tick.position.set(px,2.5,D/2+.1);g.add(tick)}
  })
  return g}
export default function MapView(){
  const ref=useRef(),[info,setInfo]=useState('Chargement…'),[data,setData]=useState(null),[sel,setSel]=useState(null),selFn=useRef(null)
  useEffect(()=>{
    const el=ref.current,W=()=>el.clientWidth,H=()=>el.clientHeight,mobile=innerWidth<600
    const r=new THREE.WebGLRenderer({antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,2));r.setSize(W(),H());r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;el.appendChild(r.domElement)
    const scene=new THREE.Scene()
    const sky=document.createElement('canvas');sky.width=2;sky.height=256;const sx=sky.getContext('2d'),gr=sx.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#5a4a7e');gr.addColorStop(.3,'#b0587f');gr.addColorStop(.55,'#f08a6a');gr.addColorStop(.8,'#fbc183');gr.addColorStop(1,'#ffe1a8');sx.fillStyle=gr;sx.fillRect(0,0,2,256)
    const st=new THREE.CanvasTexture(sky);st.colorSpace=THREE.SRGBColorSpace;scene.background=st;scene.fog=new THREE.Fog('#f2ae86',50,140)
    const cam=new THREE.PerspectiveCamera(mobile?64:42,W()/H(),.1,300);cam.position.set(0,mobile?46:30,mobile?46:36)
    const ctl=new OrbitControls(cam,r.domElement);ctl.target.set(0,0,1);ctl.enableDamping=true;ctl.minPolarAngle=.45;ctl.maxPolarAngle=1.2;ctl.minDistance=9;ctl.maxDistance=62;ctl.enablePan=true;ctl.screenSpacePanning=false
    scene.add(new THREE.HemisphereLight('#ffcfb0','#9a8a60',1.3))
    const sun=new THREE.DirectionalLight('#ff9a52',2.6);sun.position.set(-46,15,24);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048)
    Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:140});sun.shadow.bias=-.0005;scene.add(sun)
    // terrain
    const gg=new THREE.PlaneGeometry(260,260,130,130);gg.rotateX(-Math.PI/2);const pa=gg.attributes.position,cols=[]
    const c1=new THREE.Color('#b3ae62'),c2=new THREE.Color('#9aa456'),c3=new THREE.Color('#6f8548'),tmp=new THREE.Color()
    for(let i=0;i<pa.count;i++){const x=pa.getX(i),z=pa.getZ(i),h=hill(x,z);pa.setY(i,h);const n=noise(x*1.7,z*1.7)*.5+.5;tmp.copy(c1).lerp(c2,n);if(h>1)tmp.lerp(c3,Math.min(1,h/5));cols.push(tmp.r,tmp.g,tmp.b)}
    gg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));gg.computeVertexNormals()
    const ground=new THREE.Mesh(gg,new THREE.MeshLambertMaterial({vertexColors:true}));ground.receiveShadow=true;scene.add(ground)
    const lawn=new THREE.Mesh(new THREE.CircleGeometry(19,64),M('#bdbc6c'));lawn.rotation.x=-Math.PI/2;lawn.position.y=.02;lawn.receiveShadow=true;scene.add(lawn)
    const plaza=new THREE.Mesh(new THREE.CircleGeometry(4.2,48),M('#e8c9a0'));plaza.rotation.x=-Math.PI/2;plaza.position.y=.05;plaza.receiveShadow=true;scene.add(plaza)
    const ringp=new THREE.Mesh(new THREE.RingGeometry(8.3,9.5,64),M('#e8c9a0'));ringp.rotation.x=-Math.PI/2;ringp.position.y=.045;scene.add(ringp)
    const d=new THREE.Object3D()
    // exclusion zones
    const slots=Array.from({length:SLOTS},(_,i)=>slotPos(i))
    // bureau d'Archy
    const dsk=new THREE.Group()
    const bx=(w,h,d,c,x,y,z,sh=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof c==='string'?M(c):c);m.position.set(x,y,z);m.castShadow=sh;dsk.add(m);return m}
    bx(3.2,.95,1.3,'#7a4a2a',0,.48,.2);bx(3.5,.12,1.55,'#5a3520',0,1.0,.2)
    bx(1.0,.5,.02,'#3a2312',0,.55,.862) // plaque fond
    const pc=document.createElement('canvas');pc.width=512;pc.height=128;const px2=pc.getContext('2d');px2.fillStyle='#e2b659';px2.fillRect(0,0,512,128);px2.strokeStyle='#8a6a1e';px2.lineWidth=8;px2.strokeRect(6,6,500,116);px2.fillStyle='#3a2a0a';px2.font='800 86px Georgia,serif';px2.textAlign='center';px2.textBaseline='middle';px2.fillText('ARCHY',256,70)
    const pt=new THREE.CanvasTexture(pc);pt.colorSpace=THREE.SRGBColorSpace
    const plq=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.38),new THREE.MeshBasicMaterial({map:pt}));plq.position.set(0,.62,.865);dsk.add(plq)
    // fauteuil
    bx(1.0,.14,.9,'#7f1d1d',0,.55,-.95);bx(1.0,1.1,.14,'#7f1d1d',0,1.2,-1.4)
    // Archy : costume
    bx(.62,.7,.36,'#1e293b',0,1.2,-.9);bx(.14,.5,.04,'#f8fafc',0,1.25,-.71);bx(.07,.4,.04,'#d4a017',0,1.2,-.69)
    const hd=new THREE.Mesh(new THREE.SphereGeometry(.27,16,14),M('#f2c9a0'));hd.position.set(0,1.78,-.88);hd.castShadow=true;dsk.add(hd)
    const hr=new THREE.Mesh(new THREE.SphereGeometry(.285,16,10,0,Math.PI*2,0,Math.PI/2.2),M('#2b1d14'));hr.position.set(0,1.82,-.9);dsk.add(hr)
    ;[-1,1].forEach(sd=>{const ey=new THREE.Mesh(new THREE.SphereGeometry(.035,6,6),new THREE.MeshBasicMaterial({color:'#111'}));ey.position.set(sd*.09,1.8,-.62);dsk.add(ey)
      bx(.14,.14,.6,'#1e293b',sd*.4,1.18,-.5);bx(.12,.08,.14,'#f2c9a0',sd*.4,1.1,-.17)
      const gl=new THREE.Mesh(new THREE.TorusGeometry(.07,.012,6,12),new THREE.MeshBasicMaterial({color:'#222'}));gl.position.set(sd*.09,1.8,-.61);dsk.add(gl)})
    // objets sur le bureau
    bx(.7,.04,.5,'#f8fafc',-.9,1.08,.35);bx(.5,.04,.4,'#fef3c7',-.75,1.12,.3);bx(.55,.03,.38,'#cbd5e1',.85,1.08,.3);bx(.5,.34,.03,'#111827',.9,1.28,.05)
    bx(.1,.5,.1,'#334155',1.45,1.3,-.1);const lp=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),new THREE.MeshBasicMaterial({color:'#ffd27a'}));lp.position.set(1.45,1.62,-.1);dsk.add(lp)
    dsk.scale.setScalar(1.25);scene.add(dsk)
    const dl=new THREE.PointLight('#ffb866',14,14,1.6);dl.position.set(1.8,2.6,0);scene.add(dl)
    // lampadaires
    const gc=document.createElement('canvas');gc.width=gc.height=64;const gx=gc.getContext('2d'),gg2=gx.createRadialGradient(32,32,2,32,32,32);gg2.addColorStop(0,'rgba(255,214,130,.95)');gg2.addColorStop(.4,'rgba(255,170,80,.35)');gg2.addColorStop(1,'rgba(255,150,60,0)');gx.fillStyle=gg2;gx.fillRect(0,0,64,64)
    const gtex=new THREE.CanvasTexture(gc)
    const lamp=(x,z)=>{const y=hill(x,z),g=new THREE.Group();g.position.set(x,y,z)
      const po=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,2.3,6),M('#3a2c26'));po.position.y=1.15;po.castShadow=true;g.add(po)
      const bs=new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,.2,8),M('#3a2c26'));bs.position.y=.1;g.add(bs)
      const bl=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),new THREE.MeshBasicMaterial({color:'#ffe2a0'}));bl.position.y=2.4;g.add(bl)
      const hl=new THREE.Sprite(new THREE.SpriteMaterial({map:gtex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));hl.scale.set(2.6,2.6,1);hl.position.y=2.4;g.add(hl);scene.add(g);return g}
    for(let i=0;i<SLOTS;i++){const a=i*Math.PI*2/SLOTS;lamp(Math.cos(a)*10.6,Math.sin(a)*10.6);lamp(Math.cos(a)*17.2,Math.sin(a)*17.2)}
    // buissons + cailloux
    const bushG=new THREE.IcosahedronGeometry(.55,0),rockG=new THREE.DodecahedronGeometry(.35,0)
    const NB=mobile?90:170,bu=new THREE.InstancedMesh(bushG,M('#fff'),NB),NR=mobile?50:100,rk=new THREE.InstancedMesh(rockG,M('#fff'),NR);let bi=0,ri=0
    for(let k=0;k<2500&&(bi<NB||ri<NR);k++){const a=R()*6.28,rr=11+R()*42,x=Math.cos(a)*rr,z=Math.sin(a)*rr
      if(rr<30&&(slots.some(s=>Math.hypot(x-s.x,z-s.z)<3.6)||(rr>8&&rr<10.5)||Math.hypot((x+26)/1.4,z-14)<6.4))continue
      if(Math.hypot((x+26)/1.4,z-14)<6.6)continue
      if(R()<.6&&bi<NB){const sc=.5+R()*.55;d.position.set(x,hill(x,z)+.3*sc,z);d.scale.set(sc,sc*.8,sc);d.rotation.set(0,R()*6,0);d.updateMatrix();bu.setMatrixAt(bi,d.matrix);bu.setColorAt(bi,new THREE.Color().setHSL(.2+R()*.12,.4,.28+R()*.1));bi++}
      else if(ri<NR){const sc=.4+R()*.6;d.position.set(x,hill(x,z)+.1*sc,z);d.scale.set(sc,sc*.7,sc);d.rotation.set(R(),R()*6,R());d.updateMatrix();rk.setMatrixAt(ri,d.matrix);rk.setColorAt(ri,new THREE.Color().setHSL(.07,.15,.38+R()*.2));ri++}}
    bu.count=bi;rk.count=ri;[bu,rk].forEach(m=>{m.castShadow=true;m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true;scene.add(m)})
    // étang
    const pond=new THREE.Mesh(new THREE.CircleGeometry(5,40),new THREE.MeshBasicMaterial({color:'#c9929a'}));pond.rotation.x=-Math.PI/2;pond.position.set(-26,.06,14);pond.scale.set(1.4,1,1);scene.add(pond)
    const bank=new THREE.Mesh(new THREE.CircleGeometry(5.6,40),M('#e7dcae'));bank.rotation.x=-Math.PI/2;bank.position.set(-26,.04,14);bank.scale.set(1.4,1,1);scene.add(bank)
    const free=(x,z,m=0)=>{const rr=Math.hypot(x,z);if(rr<17+m)return false;if(Math.hypot((x+26)/1.4,z-14)<6.4+m)return false;return true}
    // arbres (instanciés)
    const trunkG=new THREE.CylinderGeometry(.2,.3,1.3,6),canopyG=new THREE.IcosahedronGeometry(1.25,0),pineG=new THREE.ConeGeometry(1.1,1.7,7)
    const NT=mobile?170:300,tr=new THREE.InstancedMesh(trunkG,M('#7a4b26'),NT),cn=new THREE.InstancedMesh(canopyG,M('#ffffff'),NT),pn=new THREE.InstancedMesh(pineG,M('#ffffff'),NT*2)
    let ti=0,pi=0
    for(let k=0;ti<NT&&k<4000;k++){const a=R()*7,rr=17+R()*R()*70+R()*6,x=Math.cos(a)*rr,z=Math.sin(a)*rr;if(!free(x,z,.5))continue
      if(rr<26&&R()<.6)continue
      const y=hill(x,z),s=.8+R()*.8,pine=R()<.4
      d.position.set(x,y+.65*s,z);d.scale.setScalar(s);d.rotation.set(0,R()*6,0);d.updateMatrix();tr.setMatrixAt(ti,d.matrix)
      if(pine){for(let j=0;j<2;j++){d.position.set(x,y+(1.5+j*.9)*s,z);d.scale.setScalar(s*(1-j*.3));d.updateMatrix();pn.setMatrixAt(pi,d.matrix);pn.setColorAt(pi,new THREE.Color().setHSL(.3+R()*.06,.35,.2+R()*.07));pi++}
        cn.setMatrixAt(ti,new THREE.Matrix4().makeScale(0,0,0))}
      else{d.position.set(x,y+(1.9)*s,z);d.scale.setScalar(s);d.updateMatrix();cn.setMatrixAt(ti,d.matrix);cn.setColorAt(ti,new THREE.Color().setHSL(...((q=>q<.07?[.05+R()*.02,.5,.5]:q<.15?[.96,.3,.64]:q<.22?[.11,.45,.52]:[.2+R()*.07,.4,.3+R()*.1])(R()))))}
      ti++}
    ;[tr,cn,pn].forEach(m=>{m.castShadow=true;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true});tr.count=ti;cn.count=ti;pn.count=pi;scene.add(tr,cn,pn)
    // herbes hautes (touffes) + fleurs
    const tuftG=new THREE.ConeGeometry(.2,.6,5),NG=mobile?700:1400,tg=new THREE.InstancedMesh(tuftG,M('#2f8f3a'),NG);let gi=0
    for(let p=0;p<9;p++){const a=R()*6.28,rr=20+R()*14,cx=Math.cos(a)*rr,cz=Math.sin(a)*rr;for(let k=0;k<NG/9&&gi<NG;k++){const x=cx+(R()-.5)*7,z=cz+(R()-.5)*5;if(!free(x,z))continue;d.position.set(x,hill(x,z)+.3,z);d.scale.set(1,.7+R()*.7,1);d.rotation.set((R()-.5)*.3,R()*6,(R()-.5)*.3);d.updateMatrix();tg.setMatrixAt(gi,d.matrix);tg.setColorAt(gi,new THREE.Color().setHSL(.2+R()*.06,.45,.32+R()*.1));gi++}}
    tg.count=gi;scene.add(tg)
    const fl=new THREE.InstancedMesh(new THREE.SphereGeometry(.12,6,5),M('#fff'),160);let fi=0;const fc=['#e58a9a','#e8c26a','#f3e6d0','#b89ad0']
    for(let k=0;k<900&&fi<160;k++){const a=R()*6.28,rr=4.8+R()*13,x=Math.cos(a)*rr,z=Math.sin(a)*rr;if(rr>8&&rr<9.8)continue;if(rr<13.6&&rr>9.8){/*près des maisons*/}
      let near=false;slots.forEach(s=>{if(Math.hypot(x-s.x,z-s.z)<3.4)near=true;const ang=Math.atan2(z,x);let da=Math.abs(((ang-s.a+Math.PI*3)%(Math.PI*2))-Math.PI);da=Math.PI-da;if(da<.13&&rr<RING)near=true});if(near)continue
      d.position.set(x,.1,z);d.scale.setScalar(1);d.rotation.set(0,0,0);d.updateMatrix();fl.setMatrixAt(fi,d.matrix);fl.setColorAt(fi,new THREE.Color(fc[fi%4]));fi++}
    fl.count=fi;scene.add(fl)
    // montagnes lointaines + nuages
    for(let i=0;i<16;i++){const a=i/16*6.28+R()*.2,rr=105+R()*20,s=16+R()*18;const m=new THREE.Mesh(new THREE.ConeGeometry(s,s*1.1,6),new THREE.MeshLambertMaterial({color:new THREE.Color().setHSL(.78+R()*.08,.25,.42+R()*.08)}));m.position.set(Math.cos(a)*rr,s*.4,Math.sin(a)*rr);scene.add(m)}
    const clouds=[];for(let i=0;i<9;i++){const c=new THREE.Group();for(let j=0;j<4;j++){const b=new THREE.Mesh(new THREE.SphereGeometry(2+R()*1.4,10,8),new THREE.MeshBasicMaterial({color:'#ffd0b0',transparent:true,opacity:.8}));b.position.set(j*2.3-3,R(),R()*1.5);b.scale.y=.6;c.add(b)}
      c.position.set(-90+R()*180,58+R()*12,-90+R()*60);scene.add(c);clouds.push(c)}
    // dynamique
    const dyn=new THREE.Group();scene.add(dyn);let actors=[],glow=[],last='',slotOf={}
    function build(dd){
      dyn.clear();actors=[];glow=[];slotOf={}
      const us=dd.universes.filter(u=>dd.tasks.some(t=>t.universe===u.id))
      us.forEach((u,i)=>{const sp=slots[i],ts=dd.tasks.filter(t=>t.universe===u.id),th=Math.atan2(-sp.x,-sp.z)
        const h=house(u,ts);h.userData.uni=u.id;h.scale.setScalar(.85);h.position.set(sp.x,hill(sp.x,sp.z),sp.z);h.rotation.y=th;dyn.add(h);h.traverse(o=>{if(o.userData.act)glow.push(o)})
        const dir=new THREE.Vector3(-Math.sin(th)*-1,0,0) // direction vers le centre
        const ux=-sp.x/RING,uz=-sp.z/RING,len=RING-3-4.2
        const path=new THREE.Mesh(new THREE.PlaneGeometry(1.5,len),M('#e8c9a0'));path.rotation.x=-Math.PI/2;path.rotation.z=-Math.atan2(ux,uz)+Math.PI;path.position.set(sp.x+ux*(3+len/2),.05,sp.z+uz*(3+len/2));path.rotation.order='YXZ';path.rotation.set(-Math.PI/2,0,0);path.rotation.y=0
        const pg=new THREE.Group();pg.position.copy(path.position);path.position.set(0,0,0);path.rotation.set(-Math.PI/2,0,0);pg.add(path);pg.rotation.y=Math.atan2(ux,uz);dyn.add(pg)
        const sg=label(`${u.name}${ts.some(t=>t.status==='active')?' ●':''}`,u.color,52);sg.position.set(sp.x,hill(sp.x,sp.z)+6.3,sp.z);sg.userData.uni=u.id;dyn.add(sg);slotOf[u.id]=sp
        const door={x:sp.x+ux*2.9,z:sp.z+uz*2.9},hub={x:ux*0+(-ux)*0+ -ux*0,z:0}
        const px=-uz,pz=ux // latéral
        ts.filter(t=>t.status==='active').forEach((t,k)=>{const w=trainer(u.color);w.scale.setScalar(1.45);w.userData.uni=u.id;dyn.add(w)
          const lb=label(t.title.length>24?t.title.slice(0,23)+'…':t.title,'#16a34a',40);lb.scale.multiplyScalar(.55);lb.position.set(0,1.95,0);w.add(lb);const b=bubble('!','#16a34a');b.position.set(0,1.55,0);w.add(b)
          actors.push({w,type:'walk',from:{x:ux*-5.2+px*(k-.5)*.8,z:uz*-5.2+pz*(k-.5)*.8}.x===undefined?0:0,ax:-ux*0,sp,ux,uz,px,pz,off:(k-.3)*.7,ph:i*1.3+k*2.1,spd:.5+.1*k})})
        ts.filter(t=>t.status==='waiting'||t.status==='scheduled').forEach((t,k)=>{const w=trainer('#cbd5e1','#94a3b8');w.scale.setScalar(1.45);w.userData.uni=u.id;const wx=door.x+px*(2.1+k*.9),wz=door.z+pz*(2.1+k*.9);w.position.set(wx,hill(wx,wz),wz);w.rotation.y=Math.atan2(-ux,-uz)*0+Math.atan2(ux,uz)+Math.PI*.9
          const b=bubble(t.status==='waiting'?'…':'⏱',t.status==='waiting'?'#d97706':'#2563eb');b.position.set(0,1.6,0);w.add(b);dyn.add(w);actors.push({w,type:'idle',ph:k+i})})
      })
      const a=dd.tasks.filter(t=>t.status==='active').length,wt=dd.tasks.filter(t=>t.status==='waiting').length
      setInfo(`${a} au travail · ${wt} en attente du boss`)
    }
    const load=()=>fetch(URL_DATA+'?t='+Date.now()).then(r=>r.json()).then(dd=>{const s=JSON.stringify(dd);if(s!==last){last=s;setData(dd);build(dd);if(selId)select(selId)}}).catch(()=>setInfo('Données indisponibles'))
    const selRing=new THREE.Mesh(new THREE.RingGeometry(3.4,3.9,40),new THREE.MeshBasicMaterial({color:'#facc15',side:THREE.DoubleSide,transparent:true,opacity:.9}));selRing.rotation.x=-Math.PI/2;selRing.visible=false;scene.add(selRing)
    let focus=0,tgt=new THREE.Vector3(0,0,1),selId=null
    const select=(id)=>{selId=id;setSel(id);if(id&&slotOf[id]){const sp=slotOf[id];selRing.position.set(sp.x,hill(sp.x,sp.z)+.15,sp.z);selRing.visible=true;tgt.set(sp.x*.6,0,sp.z*.6+2);focus=70}else{selRing.visible=false}}
    selFn.current=select
    const ray=new THREE.Raycaster(),mp=new THREE.Vector2();let dn=null
    const cv=r.domElement
    const pd=e=>{dn={x:e.clientX,y:e.clientY,t:performance.now()}}
    const pu=e=>{if(!dn)return;const mv=Math.hypot(e.clientX-dn.x,e.clientY-dn.y),dt=performance.now()-dn.t;dn=null;if(mv>8||dt>500)return
      const b=cv.getBoundingClientRect();mp.set(((e.clientX-b.left)/b.width)*2-1,-((e.clientY-b.top)/b.height)*2+1);ray.setFromCamera(mp,cam)
      const hit=ray.intersectObjects(dyn.children,true).find(h=>{let o=h.object;while(o){if(o.userData&&o.userData.uni)return true;o=o.parent}return false})
      if(!hit){select(null);return};let o=hit.object;while(o&&!(o.userData&&o.userData.uni))o=o.parent;select(o.userData.uni)}
    cv.addEventListener('pointerdown',pd);cv.addEventListener('pointerup',pu)
    window.__cam=cam;window.__ctl=ctl;window.__pick=(id)=>select(id) // utile pour tests
    load();const iv=setInterval(load,5000)
    let stop=false;const clock=new THREE.Clock()
    const loop=()=>{if(stop)return;requestAnimationFrame(loop);const t=clock.getElapsedTime()
      actors.forEach(o=>{const w=o.w
        if(o.type==='walk'){const raw=Math.sin(t*o.spd+o.ph)*1.5,mov=Math.abs(raw)<1,s=(Math.max(-1,Math.min(1,raw))+1)/2,d0=3.9,d1=RING-3.2,dist=d0+(d1-d0)*s;const dv=mov?(Math.cos(t*o.spd+o.ph)>=0?1:-1):(raw<0?-1:1)
          const x=-o.ux*-dist*-1+ (-o.ux)*0, z=0
          const px=o.ux*0
          const X=(o.sp.x/RING)*dist+o.px*o.off,Z=(o.sp.z/RING)*dist+o.pz*o.off;w.position.set(X,hill(X,Z),Z);w.rotation.y=Math.atan2(o.sp.x*dv,o.sp.z*dv)
          const sw=mov?Math.sin(t*9+o.ph)*.7:0;w.userData.legs[0].rotation.x=sw;w.userData.legs[1].rotation.x=-sw;w.userData.arms[0].rotation.x=-sw*.8;w.userData.arms[1].rotation.x=sw*.8}
        else w.position.y+=0})
      if(focus>0){ctl.target.lerp(tgt,.1);focus--}
      if(selRing.visible)selRing.material.opacity=.6+.4*Math.sin(t*5)
      glow.forEach(g=>{g.scale.setScalar(1+.08*Math.sin(t*4))})
      clouds.forEach((c,i)=>{c.position.x+=.01+i*.001;if(c.position.x>80)c.position.x=-80})
      ctl.update();r.render(scene,cam)}
    loop()
    const rs=()=>{r.setSize(W(),H());cam.aspect=W()/H();cam.updateProjectionMatrix()};addEventListener('resize',rs)
    return()=>{stop=true;clearInterval(iv);removeEventListener('resize',rs);cv&&0;r.dispose();el.removeChild(r.domElement)}
  },[])
  return <div style={{position:'fixed',inset:0}}><div ref={ref} style={{position:'absolute',inset:0}}/>
    {data&&sel&&<Sheet d={data} id={sel} close={()=>selFn.current&&selFn.current(null)}/>}
    <div style={{position:'absolute',top:10,left:10,right:10,display:'flex',justifyContent:'space-between',font:'600 13px system-ui',color:'#0f2a1a',pointerEvents:'none'}}>
      <Toggle view="map"/><span style={{background:'#ffffffcc',padding:'3px 9px',borderRadius:99}}>{info}</span></div>
    {!sel&&<div style={{position:'absolute',bottom:10,left:10,font:'11px system-ui',color:'#0f2a1a',background:'#ffffffb0',padding:'3px 8px',borderRadius:8}}>dresseur qui marche = chantier actif · PNJ « … » = attend le boss · ⏱ = programmé · coche = terminé · touche une maison</div>}</div>
}

const fmt=(iso)=>iso?new Date(iso).toLocaleString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'}):''
const LB={active:'En cours',waiting:"Attend le boss",scheduled:'Programmé',blocked:'Bloqué',queued:'En file',done:'Terminé'}
const ORD={active:0,blocked:1,waiting:2,scheduled:3,queued:4,done:5}
function Sheet({d,id,close}){
  const u=d.universes.find(x=>x.id===id);if(!u)return null
  const ts=d.tasks.filter(t=>t.universe===id).sort((a,b)=>ORD[a.status]-ORD[b.status])
  const when=t=>t.status==='done'?'terminé '+fmt(t.doneAt):t.status==='scheduled'?fmt(t.scheduledAt):t.status==='active'&&t.startedAt?'depuis '+fmt(t.startedAt):''
  return <div onPointerDown={e=>e.stopPropagation()} style={{position:'absolute',left:0,right:0,bottom:0,maxHeight:'58%',overflowY:'auto',background:'#fffdf6f2',borderRadius:'18px 18px 0 0',borderTop:`6px solid ${u.color}`,padding:'12px 14px 22px',font:'14px/1.35 system-ui,sans-serif',color:'#1f2937',boxShadow:'0 -8px 30px #0003',maxWidth:560,margin:'0 auto'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><b style={{fontSize:18}}>{u.emoji} {u.name}</b><button onClick={close} style={{border:0,background:'#e5e7eb',borderRadius:99,width:32,height:32,fontSize:16}}>✕</button></div>
    {ts.map(t=>{const lg=d.log.filter(l=>l.task===t.id).slice(0,4);return <div key={t.id} style={{padding:'9px 0',borderTop:'1px solid #e5e7eb'}}>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><span style={{background:SC[t.status],color:t.status==='done'?'#fff':'#111',borderRadius:99,padding:'1px 9px',fontSize:12,fontWeight:700}}>{LB[t.status]}</span><b>{t.title}</b></div>
      {when(t)&&<div style={{color:'#6b7280',fontSize:12}}>{when(t)}</div>}
      {t.note&&<div style={{marginTop:2}}>{t.note}</div>}
      {lg.length>0&&<ul style={{margin:'4px 0 0',padding:0,listStyle:'none',fontSize:12,color:'#4b5563'}}>{lg.map((l,i)=><li key={i}><span style={{color:'#9ca3af'}}>{fmt(l.at)}</span> {l.text}</li>)}</ul>}</div>})}
  </div>}
